const JobAnalysis = require('../models/JobAnalysis');
const Resume = require('../models/Resume');
const Course = require('../models/Course');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
    if (resume.parsedData?.extracted_skills) {
      userSkills = resume.parsedData.extracted_skills;
    } else if (resume.builtResumeData?.skills) {
      const skillsData = resume.builtResumeData.skills;
      userSkills = [
        ...(skillsData.technical || []),
        ...(skillsData.tools || []),
        ...(skillsData.soft || [])
      ];
    }

    console.log('✅ User skills extracted:', userSkills.length);

    // Scrape job posting
    let jobData;
    try {
      jobData = await scrapeJobPosting(jobUrl);
      console.log('✅ Job posting scraped:', jobData.jobTitle);
    } catch (error) {
      console.error('❌ Error scraping job:', error);
      return res.status(400).json({
        status: 'error',
        message: 'Failed to fetch job posting. Please check the URL.'
      });
    }

    // Analyze with AI
    const aiAnalysis = await analyzeWithAI(jobData, userSkills, resume);
    console.log('✅ AI analysis completed');

    // Calculate match score with advanced algorithm
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
      resume
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
      resumeUsed: resume._id
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

    // Create resume record
    const resume = new Resume({
      userId,
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      fileSize: file.size,
      fileType: file.mimetype.split('/')[1],
      uploadedAt: new Date(),
      isBuiltResume: false
    });

    // Call ML service to parse the resume
    try {
      const FormData = require('form-data');
      const fs = require('fs');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype
      });

      const mlResponse = await axios.post(
        `${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/parse-resume`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 60000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      if (mlResponse.data) {
        resume.parsedData = mlResponse.data;
        console.log('✅ Resume parsed by ML service');
      }
    } catch (mlError) {
      console.error('⚠️ ML parsing failed, saving without parsed data:', mlError.message);
      // Continue without parsed data - will use basic analysis
    }

    await resume.save();
    console.log('✅ Resume saved to database');

    // Extract user skills from the newly uploaded resume
    let userSkills = [];
    if (resume.parsedData?.extracted_skills) {
      userSkills = resume.parsedData.extracted_skills;
      console.log('✅ Skills from ML parsing:', userSkills.length);
    } else {
      // Fallback: Try to extract skills using AI from raw text
      console.log('⚠️ No ML parsed skills, attempting AI extraction from file');
      try {
        const extractedSkills = await extractSkillsFromFile(resume.filePath);
        if (extractedSkills && extractedSkills.length > 0) {
          userSkills = extractedSkills;
          // Store in parsedData for future reference
          resume.parsedData = { extracted_skills: extractedSkills };
          await resume.save();
          console.log('✅ Skills extracted via AI:', userSkills.length);
        }
      } catch (extractError) {
        console.error('⚠️ AI skill extraction failed:', extractError.message);
      }
    }

    if (userSkills.length === 0) {
      console.warn('⚠️ No skills found in resume - analysis will be limited');
    }

    // Scrape job posting
    let jobData;
    try {
      jobData = await scrapeJobPosting(jobUrl);
      console.log('✅ Job posting scraped:', jobData.jobTitle);
    } catch (error) {
      console.error('❌ Error scraping job:', error);
      
      // Delete the uploaded resume if job scraping fails to avoid orphaned resumes
      await Resume.findByIdAndDelete(resume._id);
      const fs = require('fs');
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
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
      resume
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
      resumeUsed: resume._id
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

async function scrapeJobPosting(url) {
  try {
    // Set user agent to avoid blocking
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Generic scraping - will work for most job sites
    let jobTitle = $('h1').first().text().trim() || 
                   $('[class*="job-title"]').first().text().trim() ||
                   $('[class*="title"]').first().text().trim() ||
                   'Position';

    let companyName = $('[class*="company"]').first().text().trim() ||
                      $('[class*="employer"]').first().text().trim() ||
                      null;

    // Get all text content
    const bodyText = $('body').text();
    
    // Extract job description (main content)
    let jobDescription = $('article').text().trim() ||
                        $('[class*="description"]').text().trim() ||
                        $('main').text().trim() ||
                        bodyText.substring(0, 5000);

    // Try to extract location
    let location = $('[class*="location"]').first().text().trim() || null;

    // Try to extract experience
    let experience = null;
    const expMatch = bodyText.match(/(\d+[\+]?\s*(?:to|-)\s*\d+|[\d+]+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience)?/i);
    if (expMatch) {
      experience = expMatch[0];
    }

    // Try to extract salary
    let salary = null;
    const salaryMatch = bodyText.match(/(?:₹|Rs\.?|INR|USD|\$)\s*[\d,]+(?:\s*-\s*[\d,]+)?(?:\s*(?:LPA|PA|per\s*annum|annually))?/i);
    if (salaryMatch) {
      salary = salaryMatch[0];
    }

    return {
      jobTitle,
      companyName,
      jobDescription,
      location,
      experience,
      salary
    };

  } catch (error) {
    console.error('Scraping error:', error.message);
    throw new Error('Failed to scrape job posting');
  }
}

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
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
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
function calculateMatchScore(userSkills, matchingSkills, missingSkills, jobData = {}, resume = {}) {
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
    grade = 'Excellent Match';
  } else if (totalScore >= 65) {
    grade = 'Good Match';
  } else if (totalScore >= 50) {
    grade = 'Fair Match';
  } else if (totalScore >= 30) {
    grade = 'Weak Match';
  } else {
    grade = 'Poor Match';
  }
  
  // Generate insights
  const insights = generateMatchInsights(scoreComponents, totalScore, missingSkills);
  
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
function generateMatchInsights(breakdown, totalScore, missingSkills) {
  const insights = [];
  
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

// Helper function to extract skills from PDF using AI
async function extractSkillsFromFile(filePath) {
  try {
    const pdf = require('pdf-parse');
    const fs = require('fs');
    
    // Read PDF content
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const resumeText = pdfData.text;

    if (!resumeText || resumeText.trim().length < 100) {
      throw new Error('Unable to extract text from PDF');
    }

    // Use Gemini AI to extract skills
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Extract all technical skills, soft skills, and tools mentioned in this resume. Return ONLY a JSON array of skill names, nothing else.

Resume Text:
${resumeText.substring(0, 3000)}

Return format: ["skill1", "skill2", "skill3", ...]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const skills = JSON.parse(jsonMatch[0]);
      return skills.filter(skill => skill && skill.length > 1);
    }

    return [];
  } catch (error) {
    console.error('Skill extraction error:', error.message);
    return [];
  }
}

module.exports = {
  analyzeJobPosting: exports.analyzeJobPosting,
  analyzeWithUpload: exports.analyzeWithUpload,
  getJobAnalysisHistory: exports.getJobAnalysisHistory,
  getJobAnalysis: exports.getJobAnalysis,
  deleteJobAnalysis: exports.deleteJobAnalysis
};
