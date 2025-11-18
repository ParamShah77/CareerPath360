const JobAnalysis = require('../models/JobAnalysis');
const Resume = require('../models/Resume');
const Course = require('../models/Course');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { scrapeJobPosting } = require('../services/jobScraper');
const { applyFallbackParsing } = require('../services/fallbackResumeAnalyzer');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Analyze job posting from URL
// @route   POST /api/job-matching/analyze
// @access  Private
exports.analyzeJobPosting = async (req, res) => {
  try {
    const { jobUrl, resumeId } = req.body;
    const userId = req.user.id;

    if (!jobUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Job URL is required'
      });
    }

    console.log('📊 Analyzing job posting:', jobUrl);

    // Fetch the resume if provided
    let resume = null;
    if (resumeId) {
      resume = await Resume.findOne({ _id: resumeId, userId });
      if (!resume) {
        return res.status(404).json({
          status: 'error',
          message: 'Resume not found'
        });
      }
    } else {
      // Get the most recent resume
      resume = await Resume.findOne({ userId })
        .sort({ createdAt: -1 });
    }

    if (!resume) {
      return res.status(404).json({
        status: 'error',
        message: 'No resume found. Please upload or create a resume first.'
      });
    }

    // Extract user skills from resume
    let userSkills = [];
    if (resume.parsedData?.extracted_skills?.length) {
      userSkills = resume.parsedData.extracted_skills;
    } else if (resume.builtResumeData?.skills) {
      const skillsData = resume.builtResumeData.skills;
      userSkills = [
        ...(skillsData.technical || []),
        ...(skillsData.tools || []),
        ...(skillsData.soft || [])
      ];
    }

    if (userSkills.length === 0) {
      userSkills = await hydrateResumeSkills(resume);
    }

    console.log('✅ User skills extracted:', userSkills.length);

    // Scrape job posting
    let jobData;
    try {
      jobData = await scrapeJobPosting(jobUrl);
      console.log(`✅ Job posting scraped via ${jobData.scrapeStrategy}:`, jobData.jobTitle);
    } catch (error) {
      console.error('❌ Error scraping job:', error);
      return res.status(400).json({
        status: 'error',
        message: 'Failed to fetch job posting. Please check the URL.',
        hint: error.message
      });
    }

    // Analyze with AI
    const aiAnalysis = await analyzeWithAI(jobData, userSkills, resume);
    console.log('✅ AI analysis completed');

    // Calculate match score with advanced algorithm
    const atsScoreMeta = extractAtsScore(resume);
    const matchResult = calculateMatchScore(
      userSkills,
      aiAnalysis.matchingSkills,
      aiAnalysis.missingSkills,
      {
        requiredSkills: aiAnalysis.requiredSkills,
        preferredSkills: aiAnalysis.preferredSkills,
        experience: jobData.experience,
        jobDescription: jobData.jobDescription
      },
      resume,
      atsScoreMeta.value
    );

    console.log('📊 Match Score Breakdown:', matchResult);

    // Get recommended courses
    const recommendedCourses = await getRecommendedCourses(aiAnalysis.missingSkills);

    // Save analysis to database
    const jobAnalysis = new JobAnalysis({
      userId,
      jobUrl,
      jobTitle: jobData.jobTitle,
      companyName: jobData.companyName,
      jobDescription: jobData.jobDescription,
      jobBoard: jobData.jobBoard,
      scrapeStrategy: jobData.scrapeStrategy,
      requiredSkills: aiAnalysis.requiredSkills,
      preferredSkills: aiAnalysis.preferredSkills,
      experience: jobData.experience,
      location: jobData.location,
      salary: jobData.salary,
      matchScore: matchResult.score,
      matchGrade: matchResult.grade,
      matchBreakdown: matchResult.breakdown,
      matchInsights: matchResult.insights,
      userSkills,
      matchingSkills: aiAnalysis.matchingSkills,
      missingSkills: aiAnalysis.missingSkills,
      recommendations: aiAnalysis.recommendations,
      recommendedCourses,
      strengths: aiAnalysis.strengths,
      areasToImprove: aiAnalysis.areasToImprove,
      aiAnalysis: aiAnalysis.summary,
      resumeUsed: resume._id,
      atsScoreSnapshot: atsScoreMeta.value,
      atsScoreSource: atsScoreMeta.source
    });

    await jobAnalysis.save();
    console.log('✅ Job analysis saved to database');

    return res.status(200).json({
      status: 'success',
      data: {
        analysis: jobAnalysis
      }
    });

  } catch (error) {
    console.error('❌ Job analysis error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to analyze job posting',
      error: error.message
    });
  }
};

// @desc    Upload resume and analyze job posting
// @route   POST /api/job-matching/analyze-with-upload
// @access  Private
exports.analyzeWithUpload = async (req, res) => {
  let savedFileMeta = null;
  let resume = null;
  try {
    const { jobUrl } = req.body;
    const userId = req.user.id;
    const file = req.file;

    console.log('📥 Request received:', { jobUrl, hasFile: !!file, userId });

    if (!jobUrl) {
      console.error('❌ Job URL missing');
      return res.status(400).json({
        status: 'error',
        message: 'Job URL is required'
      });
    }

    if (!file) {
      console.error('❌ File missing');
      return res.status(400).json({
        status: 'error',
        message: 'Resume file is required'
      });
    }

    console.log('📊 Analyzing job with uploaded resume:', file.originalname);
    console.log('📊 Job URL:', jobUrl);

    // Persist file from memory storage to disk
    savedFileMeta = await persistUploadedFile(file);

    // Create resume record
    resume = new Resume({
      userId,
      originalName: file.originalname,
      fileName: savedFileMeta.fileName,
      filePath: savedFileMeta.path,
      fileSize: file.size,
      fileType: savedFileMeta.fileType,
      uploadedAt: new Date(),
      isBuiltResume: false
    });

    // Call ML service to parse the resume
    try {
      const FormData = require('form-data');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(savedFileMeta.path), {
        filename: file.originalname,
        contentType: file.mimetype
      });

      // Normalize ML service base URL and call parse endpoint
      const mlBase = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/,'');
      const mlUrl = `${mlBase}/parse-resume`;
      console.log('➡️ Calling ML service at:', mlUrl);

      const mlResponse = await axios.post(
        mlUrl,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 120000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      if (mlResponse.data) {
        // ML service returns { success: true, data: {...} } format
        const mlData = mlResponse.data.success ? mlResponse.data.data : mlResponse.data;
        resume.parsedData = mlData;
        resume.parseStatus = 'completed';
        resume.atsScore = mlData?.final_ats_score || 0;
        console.log('✅ Resume parsed by ML service');
        if (mlData?.extracted_skills?.length) {
          console.log(`✅ Extracted ${mlData.extracted_skills.length} skills from ML service`);
        }
      }
    } catch (mlError) {
      console.error('⚠️ ML parsing failed, saving without parsed data:', mlError.message);
      // Continue without parsed data - will use basic analysis
    }

    await resume.save();
    console.log('✅ Resume saved to database');

    // Extract user skills from the newly uploaded resume
    let userSkills = [];
    userSkills = await hydrateResumeSkills(resume);

    if (userSkills.length === 0) {
      console.warn('⚠️ No skills found in resume - analysis will be limited');
    }

    // Scrape job posting
    let jobData;
    try {
      jobData = await scrapeJobPosting(jobUrl);
      console.log(`✅ Job posting scraped via ${jobData.scrapeStrategy}:`, jobData.jobTitle);
    } catch (error) {
      console.error('❌ Error scraping job:', error);
      
      // Delete the uploaded resume if job scraping fails to avoid orphaned resumes
      if (resume?._id) {
        await Resume.findByIdAndDelete(resume._id);
      }
      if (savedFileMeta?.path) {
        safeDeleteFile(savedFileMeta.path);
      }
      
      return res.status(400).json({
        status: 'error',
        message: error.message.includes('404') 
          ? 'Job posting not found. The URL may be invalid or the page may have been removed.' 
          : 'Failed to fetch job posting. Please check the URL and ensure it\'s accessible.',
        hint: 'Try using job posting URLs from LinkedIn, Indeed, Naukri, or other major job boards.'
      });
    }

    // Analyze with AI
    const aiAnalysis = await analyzeWithAI(jobData, userSkills, resume);
    console.log('✅ AI analysis completed');

    // Calculate match score with advanced algorithm
    const atsScoreMeta = extractAtsScore(resume);
    const matchResult = calculateMatchScore(
      userSkills,
      aiAnalysis.matchingSkills,
      aiAnalysis.missingSkills,
      {
        requiredSkills: aiAnalysis.requiredSkills,
        preferredSkills: aiAnalysis.preferredSkills,
        experience: jobData.experience,
        jobDescription: jobData.jobDescription
      },
      resume,
      atsScoreMeta.value
    );

    console.log('📊 Match Score Breakdown:', matchResult);

    // Get recommended courses
    const recommendedCourses = await getRecommendedCourses(aiAnalysis.missingSkills);

    // Save analysis to database
    const jobAnalysis = new JobAnalysis({
      userId,
      jobUrl,
      jobTitle: jobData.jobTitle,
      companyName: jobData.companyName,
      jobDescription: jobData.jobDescription,
      jobBoard: jobData.jobBoard,
      scrapeStrategy: jobData.scrapeStrategy,
      requiredSkills: aiAnalysis.requiredSkills,
      preferredSkills: aiAnalysis.preferredSkills,
      experience: jobData.experience,
      location: jobData.location,
      salary: jobData.salary,
      matchScore: matchResult.score,
      matchGrade: matchResult.grade,
      matchBreakdown: matchResult.breakdown,
      matchInsights: matchResult.insights,
      userSkills,
      matchingSkills: aiAnalysis.matchingSkills,
      missingSkills: aiAnalysis.missingSkills,
      recommendations: aiAnalysis.recommendations,
      recommendedCourses,
      strengths: aiAnalysis.strengths,
      areasToImprove: aiAnalysis.areasToImprove,
      aiAnalysis: aiAnalysis.summary,
      resumeUsed: resume._id,
      atsScoreSnapshot: atsScoreMeta.value,
      atsScoreSource: atsScoreMeta.source
    });

    await jobAnalysis.save();
    console.log('✅ Job analysis saved to database');

    return res.status(200).json({
      status: 'success',
      data: {
        analysis: jobAnalysis,
        resumeId: resume._id
      }
    });

  } catch (error) {
    console.error('❌ Job analysis with upload error:', error);
    if (resume?._id) {
      await Resume.findByIdAndDelete(resume._id);
    }
    if (savedFileMeta?.path) {
      safeDeleteFile(savedFileMeta.path);
    }
    return res.status(500).json({
      status: 'error',
      message: 'Failed to analyze job posting with uploaded resume',
      error: error.message
    });
  }
};

// @desc    Get user's job analyses
// @route   GET /api/job-matching/history
// @access  Private
exports.getJobAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, page = 1 } = req.query;

    const analyses = await JobAnalysis.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('resumeUsed', 'originalName resumeName');

    const total = await JobAnalysis.countDocuments({ userId });

    return res.status(200).json({
      status: 'success',
      data: {
        analyses,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get history error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch job analysis history',
      error: error.message
    });
  }
};

// @desc    Get single job analysis
// @route   GET /api/job-matching/:id
// @access  Private
exports.getJobAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const analysis = await JobAnalysis.findOne({ _id: id, userId })
      .populate('resumeUsed', 'originalName resumeName');

    if (!analysis) {
      return res.status(404).json({
        status: 'error',
        message: 'Job analysis not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        analysis
      }
    });

  } catch (error) {
    console.error('❌ Get analysis error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch job analysis',
      error: error.message
    });
  }
};

// @desc    Delete job analysis
// @route   DELETE /api/job-matching/:id
// @access  Private
exports.deleteJobAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const analysis = await JobAnalysis.findOneAndDelete({ _id: id, userId });

    if (!analysis) {
      return res.status(404).json({
        status: 'error',
        message: 'Job analysis not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Job analysis deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete analysis error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete job analysis',
      error: error.message
    });
  }
};

// ===== HELPER FUNCTIONS =====

async function analyzeWithAI(jobData, userSkills, resume) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert career counselor and recruiter. Analyze the following job posting and the candidate's resume to provide detailed insights.

JOB POSTING:
Title: ${jobData.jobTitle}
Company: ${jobData.companyName || 'Not specified'}
Location: ${jobData.location || 'Not specified'}
Experience: ${jobData.experience || 'Not specified'}
Description: ${jobData.jobDescription}

CANDIDATE'S SKILLS:
${userSkills.length > 0 ? userSkills.join(', ') : 'No skills data available - please analyze based on job requirements only'}

CANDIDATE'S EXPERIENCE:
${resume.parsedData?.summary || resume.builtResumeData?.personalInfo?.summary || 'Not available'}

Please provide a comprehensive analysis in the following JSON format:
{
  "requiredSkills": ["skill1", "skill2", ...],
  "preferredSkills": ["skill1", "skill2", ...],
  "matchingSkills": ["skills that candidate has and job requires"],
  "missingSkills": ["skills that job requires but candidate lacks"],
  "strengths": ["candidate's strengths relevant to this role"],
  "areasToImprove": ["areas where candidate should improve"],
  "recommendations": ["specific actionable recommendations"],
  "summary": "A 2-3 paragraph detailed analysis of the candidate's fit for this role"
}

${userSkills.length === 0 ? 'NOTE: Since candidate skills are not available, focus on extracting job requirements and providing general recommendations.' : ''}

Provide ONLY the JSON response, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    const analysis = parseGeminiJson(response.text());
    return analysis;

  } catch (error) {
    console.error('AI analysis error:', error);
    // Return fallback analysis
    return {
      requiredSkills: [],
      preferredSkills: [],
      matchingSkills: userSkills.slice(0, Math.floor(userSkills.length * 0.6)),
      missingSkills: [],
      strengths: ['Existing skill set'],
      areasToImprove: ['Continue learning and growing'],
      recommendations: ['Review the job requirements carefully', 'Highlight relevant experience in your resume'],
      summary: 'Basic analysis completed. For detailed insights, please try again.'
    };
  }
}

/**
 * Advanced Job Match Scoring Algorithm
 * 
 * Mirrors real ATS/recruiting platforms like LinkedIn, Indeed, Greenhouse
 * Factors considered:
 * 1. Required Skills Match (40 points)
 * 2. Preferred Skills Match (20 points)
 * 3. Experience Level Alignment (20 points)
 * 4. Skill Depth & Context (10 points)
 * 5. Industry Relevance (10 points)
 * 
 * Score Range: 0-100
 * - 80-100: Excellent Match (Top 10%)
 * - 65-79: Good Match (Top 25%)
 * - 50-64: Fair Match (Top 50%)
 * - Below 50: Weak Match
 */
function calculateMatchScore(
  userSkills,
  matchingSkills,
  missingSkills,
  jobData = {},
  resume = {},
  atsScore = null
) {
  if (!userSkills || userSkills.length === 0) {
    return {
      score: 0,
      breakdown: {
        requiredSkills: 0,
        preferredSkills: 0,
        experience: 0,
        skillDepth: 0,
        industryRelevance: 0
      },
      grade: 'No Data',
      insights: ['Upload a resume with skills to see match score']
    };
  }
  
  const userSkillsLower = userSkills.map(s => s.toLowerCase());
  const matchingSkillsLower = matchingSkills.map(s => s.toLowerCase());
  const missingSkillsLower = missingSkills.map(s => s.toLowerCase());
  
  let scoreComponents = {
    requiredSkills: 0,      // 40 points max
    preferredSkills: 0,     // 20 points max
    experience: 0,          // 20 points max
    skillDepth: 0,          // 10 points max
    industryRelevance: 0    // 10 points max
  };
  
  // ═══════════════════════════════════════════════════════════
  // 1️⃣ REQUIRED SKILLS MATCH (40 points) - Most Critical
  // ═══════════════════════════════════════════════════════════
  const requiredSkills = jobData.requiredSkills || matchingSkills.slice(0, 8);
  const requiredSkillsLower = requiredSkills.map(s => s.toLowerCase());
  
  const requiredMatched = requiredSkillsLower.filter(skill => 
    userSkillsLower.some(userSkill => 
      userSkill.includes(skill) || skill.includes(userSkill)
    )
  );
  
  if (requiredSkillsLower.length > 0) {
    const requiredMatchRate = requiredMatched.length / requiredSkillsLower.length;
    
    // Non-linear scoring: Having 80% of required skills is much better than 60%
    if (requiredMatchRate >= 0.9) {
      scoreComponents.requiredSkills = 40;  // Excellent
    } else if (requiredMatchRate >= 0.75) {
      scoreComponents.requiredSkills = 35;  // Very Good
    } else if (requiredMatchRate >= 0.6) {
      scoreComponents.requiredSkills = 28;  // Good
    } else if (requiredMatchRate >= 0.4) {
      scoreComponents.requiredSkills = 18;  // Fair
    } else if (requiredMatchRate >= 0.2) {
      scoreComponents.requiredSkills = 10;  // Weak
    } else {
      scoreComponents.requiredSkills = 4;   // Poor
    }
  } else {
    // If no clear required skills, use general matching
    scoreComponents.requiredSkills = matchingSkillsLower.length > 0 ? 25 : 0;
  }
  
  // ═══════════════════════════════════════════════════════════
  // 2️⃣ PREFERRED SKILLS MATCH (20 points) - Nice to Have
  // ═══════════════════════════════════════════════════════════
  const preferredSkills = jobData.preferredSkills || [];
  const preferredSkillsLower = preferredSkills.map(s => s.toLowerCase());
  
  if (preferredSkillsLower.length > 0) {
    const preferredMatched = preferredSkillsLower.filter(skill => 
      userSkillsLower.some(userSkill => 
        userSkill.includes(skill) || skill.includes(userSkill)
      )
    );
    
    const preferredMatchRate = preferredMatched.length / preferredSkillsLower.length;
    scoreComponents.preferredSkills = Math.round(preferredMatchRate * 20);
  } else {
    // Bonus for having extra relevant skills beyond required
    const extraSkills = userSkillsLower.filter(skill => 
      !matchingSkillsLower.includes(skill) && 
      isRelevantSkill(skill)
    );
    scoreComponents.preferredSkills = Math.min(extraSkills.length * 3, 15);
  }
  
  // ═══════════════════════════════════════════════════════════
  // 3️⃣ EXPERIENCE LEVEL ALIGNMENT (20 points)
  // ═══════════════════════════════════════════════════════════
  const jobExperience = extractExperienceYears(jobData.experience || '');
  const resumeExperience = extractResumeExperience(resume);
  
  if (jobExperience && resumeExperience) {
    const experienceDiff = Math.abs(resumeExperience - jobExperience);
    
    if (experienceDiff === 0) {
      scoreComponents.experience = 20;  // Perfect match
    } else if (experienceDiff <= 1) {
      scoreComponents.experience = 18;  // Very close
    } else if (experienceDiff <= 2) {
      scoreComponents.experience = 15;  // Close
    } else if (experienceDiff <= 3) {
      scoreComponents.experience = 10;  // Acceptable
    } else {
      scoreComponents.experience = 5;   // Mismatch
    }
  } else {
    // Default if experience data unavailable
    scoreComponents.experience = 12;
  }
  
  // ═══════════════════════════════════════════════════════════
  // 4️⃣ SKILL DEPTH & CONTEXT (10 points) - Quality over Quantity
  // ═══════════════════════════════════════════════════════════
  // Having many skills is good, but depth matters more
  const skillCount = userSkills.length;
  
  if (skillCount >= 15) {
    scoreComponents.skillDepth = 10;  // Strong technical breadth
  } else if (skillCount >= 10) {
    scoreComponents.skillDepth = 8;   // Good coverage
  } else if (skillCount >= 6) {
    scoreComponents.skillDepth = 5;   // Acceptable
  } else {
    scoreComponents.skillDepth = 2;   // Limited
  }
  
  // Bonus for having core/foundational skills
  const coreSkills = ['JavaScript', 'Python', 'Java', 'SQL', 'Git', 'API', 'Agile'];
  const coreMatches = coreSkills.filter(core => 
    userSkillsLower.some(skill => skill.includes(core.toLowerCase()))
  );
  
  if (coreMatches.length >= 4) {
    scoreComponents.skillDepth = Math.min(scoreComponents.skillDepth + 2, 10);
  }
  
  // ═══════════════════════════════════════════════════════════
  // 5️⃣ INDUSTRY RELEVANCE (10 points) - Domain Fit
  // ═══════════════════════════════════════════════════════════
  // Check if candidate has industry-specific skills
  const industryKeywords = extractIndustryKeywords(jobData.jobDescription || '');
  const industryMatch = industryKeywords.filter(keyword => 
    userSkillsLower.some(skill => skill.includes(keyword.toLowerCase()))
  );
  
  scoreComponents.industryRelevance = Math.min(industryMatch.length * 2, 10);
  
  // If no industry keywords found, give base score
  if (scoreComponents.industryRelevance === 0) {
    scoreComponents.industryRelevance = 5;
  }
  
  // ═══════════════════════════════════════════════════════════
  // 🎯 FINAL SCORE CALCULATION
  // ═══════════════════════════════════════════════════════════
  const totalScore = Math.round(
    scoreComponents.requiredSkills +
    scoreComponents.preferredSkills +
    scoreComponents.experience +
    scoreComponents.skillDepth +
    scoreComponents.industryRelevance
  );
  
  // Determine grade
  let grade;
  if (totalScore >= 80) {
    grade = 'Excellent';
  } else if (totalScore >= 65) {
    grade = 'Good';
  } else if (totalScore >= 50) {
    grade = 'Fair';
  } else if (totalScore >= 30) {
    grade = 'Weak';
  } else {
    grade = 'Poor';
  }
  
  // Generate insights
  const insights = generateMatchInsights(scoreComponents, totalScore, missingSkills, atsScore);
  
  return {
    score: totalScore,
    breakdown: scoreComponents,
    grade,
    insights
  };
}

// Helper: Check if skill is relevant (not just soft skills)
function isRelevantSkill(skill) {
  const technicalIndicators = ['js', 'py', 'java', 'sql', 'api', 'cloud', 'dev', 'data', 'test', 'framework', 'database'];
  return technicalIndicators.some(indicator => skill.includes(indicator));
}

// Helper: Extract experience years from job description
function extractExperienceYears(experienceText) {
  if (!experienceText) return null;
  
  const match = experienceText.match(/(\d+)[\+\-\s]*(?:years?|yrs?)/i);
  return match ? parseInt(match[1]) : null;
}

// Helper: Extract experience from resume
function extractResumeExperience(resume) {
  // Try to calculate from work history
  if (resume.builtResumeData?.experience) {
    const experiences = resume.builtResumeData.experience;
    let totalMonths = 0;
    
    experiences.forEach(exp => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.current ? new Date() : new Date(exp.endDate || Date.now());
        const months = (end - start) / (1000 * 60 * 60 * 24 * 30);
        totalMonths += months;
      }
    });
    
    return Math.round(totalMonths / 12);
  }
  
  // Fallback: parse from resume text
  const resumeText = JSON.stringify(resume).toLowerCase();
  const expMatch = resumeText.match(/(\d+)[\+\s]*(?:years?|yrs?)/i);
  return expMatch ? parseInt(expMatch[1]) : 2; // Default 2 years if unknown
}

// Helper: Extract industry keywords
function extractIndustryKeywords(description) {
  const keywords = [];
  const text = description.toLowerCase();
  
  const industries = {
    'fintech': ['banking', 'finance', 'payment', 'trading', 'blockchain'],
    'healthcare': ['medical', 'health', 'patient', 'clinical', 'pharma'],
    'ecommerce': ['ecommerce', 'retail', 'shopping', 'marketplace', 'store'],
    'saas': ['saas', 'b2b', 'enterprise', 'cloud platform'],
    'ai/ml': ['machine learning', 'ai', 'nlp', 'computer vision', 'ml model']
  };
  
  for (const [domain, terms] of Object.entries(industries)) {
    if (terms.some(term => text.includes(term))) {
      keywords.push(domain);
    }
  }
  
  return keywords;
}

// Helper: Generate insights
function generateMatchInsights(breakdown, totalScore, missingSkills, atsScore = null) {
  const insights = [];

  if (typeof atsScore === 'number') {
    if (atsScore >= 80) {
      insights.push(`✅ ATS-ready resume detected (${atsScore}%). Expect smooth parsing.`);
    } else if (atsScore >= 65) {
      insights.push(`👍 ATS score at ${atsScore}%. Minor tweaks can push it higher.`);
    } else {
      insights.push(`⚠️ ATS score is ${atsScore}%. Optimize formatting and keywords for better parsing.`);
    }
  }
  
  if (breakdown.requiredSkills >= 35) {
    insights.push('✅ Strong match on required skills - you meet most job requirements');
  } else if (breakdown.requiredSkills >= 25) {
    insights.push('⚠️ Moderate match on required skills - consider highlighting related experience');
  } else {
    insights.push('❌ Weak match on required skills - significant skill gaps detected');
  }
  
  if (breakdown.preferredSkills >= 15) {
    insights.push('✅ Excellent bonus skills - you exceed expectations');
  }
  
  if (breakdown.experience >= 15) {
    insights.push('✅ Your experience level aligns well with this role');
  } else if (breakdown.experience < 10) {
    insights.push('⚠️ Experience mismatch - role may require different seniority level');
  }
  
  if (breakdown.skillDepth >= 8) {
    insights.push('✅ Strong technical breadth across multiple domains');
  }
  
  if (missingSkills.length > 0 && missingSkills.length <= 3) {
    insights.push(`💡 Focus on learning: ${missingSkills.slice(0, 3).join(', ')}`);
  } else if (missingSkills.length > 3) {
    insights.push(`💡 Major skill gaps: ${missingSkills.length} skills to develop`);
  }
  
  if (totalScore >= 80) {
    insights.push('🎯 You are a top candidate for this role - apply with confidence!');
  } else if (totalScore >= 65) {
    insights.push('👍 You have a solid chance - tailor your application to highlight matches');
  } else if (totalScore >= 50) {
    insights.push('📚 This role is a stretch - consider upskilling before applying');
  } else {
    insights.push('⏰ Not recommended yet - focus on building relevant skills first');
  }
  
  return insights;
}

function extractAtsScore(resume = {}) {
  if (!resume) {
    return { value: null, source: null };
  }

  const sources = [
    { value: resume.atsScore, source: 'resume' },
    { value: resume.parsedData?.final_ats_score, source: 'ml-service' },
    { value: resume.parsedData?.atsScore, source: 'ml-service' },
    { value: resume.parsedData?.finalScore, source: 'ml-service' },
    { value: resume.parsedData?.analysis?.finalScore, source: 'ml-service' }
  ];

  const match = sources.find(entry => typeof entry.value === 'number' && entry.value > 0);

  if (match) {
    return {
      value: Math.round(match.value),
      source: match.source
    };
  }

  return { value: null, source: null };
}

async function getRecommendedCourses(missingSkills) {
  try {
    if (!missingSkills || missingSkills.length === 0) {
      return [];
    }

    // Get courses that match the missing skills
    const courses = await Course.find({
      $or: [
        { title: { $regex: missingSkills.join('|'), $options: 'i' } },
        { description: { $regex: missingSkills.join('|'), $options: 'i' } },
        { skills: { $in: missingSkills.map(s => new RegExp(s, 'i')) } }
      ]
    }).limit(5);

    return courses.map(course => ({
      title: course.title,
      platform: course.platform,
      url: course.url,
      relevance: `Helps with: ${missingSkills.slice(0, 3).join(', ')}`
    }));

  } catch (error) {
    console.error('Get courses error:', error);
    return [];
  }
}

async function persistUploadedFile(file) {
  if (!file || !file.buffer) {
    throw new Error('Invalid file buffer - ensure multer uses memory storage');
  }

  const uploadsDir = path.join(__dirname, '../../uploads/resumes');
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  const fallbackExt = file.mimetype === 'application/pdf' ? '.pdf' : '.docx';
  const safeOriginal = sanitizeFilename(file.originalname, fallbackExt);
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  const storedName = `${Date.now()}-${uniqueSuffix}-${safeOriginal}`;
  const storedPath = path.join(uploadsDir, storedName);

  await fs.promises.writeFile(storedPath, file.buffer);

  const fileType = path.extname(storedName).replace('.', '') || file.mimetype?.split('/')[1] || 'pdf';

  return {
    path: storedPath,
    fileName: storedName,
    fileType
  };
}

function sanitizeFilename(name = '', fallbackExt = '.pdf') {
  const cleaned = name
    ? name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    : `resume${fallbackExt}`;

  if (path.extname(cleaned)) {
    return cleaned;
  }

  return `${cleaned}${fallbackExt}`;
}

function safeDeleteFile(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('⚠️ Unable to delete file:', filePath, err.message);
  }
}

function parseGeminiJson(text) {
  if (!text) {
    throw new Error('Empty AI response');
  }

  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response - no JSON payload found');
  }

  const payload = jsonMatch[0];
  try {
    return JSON.parse(payload);
  } catch (err) {
    try {
      return JSON5.parse(payload);
    } catch (json5Error) {
      console.error('AI JSON parse error:', json5Error.message);
      throw err;
    }
  }
}

async function hydrateResumeSkills(resume) {
  if (!resume) return [];

  // Priority 1: Check ML-parsed skills
  if (resume.parsedData?.extracted_skills?.length) {
    return resume.parsedData.extracted_skills;
  }

  // Priority 2: Check built resume skills
  if (resume.builtResumeData?.skills) {
    const skillsData = resume.builtResumeData.skills;
    const builtSkills = [
      ...(skillsData.technical || []),
      ...(skillsData.tools || []),
      ...(skillsData.soft || [])
    ];
    if (builtSkills.length > 0) {
      return builtSkills;
    }
  }

  // Priority 3: Fallback parsing from file (only if filePath exists)
  if (resume.filePath) {
    try {
      const fallbackData = await applyFallbackParsing(resume);
      if (fallbackData?.extracted_skills?.length) {
        return fallbackData.extracted_skills;
      }
    } catch (error) {
      console.error('⚠️ Fallback analyzer failed:', error.message);
    }
  }

  // Last resort: return empty array
  return [];
}

module.exports = {
  analyzeJobPosting: exports.analyzeJobPosting,
  analyzeWithUpload: exports.analyzeWithUpload,
  getJobAnalysisHistory: exports.getJobAnalysisHistory,
  getJobAnalysis: exports.getJobAnalysis,
  deleteJobAnalysis: exports.deleteJobAnalysis
};
