const Analysis = require('../models/Analysis');
const Resume = require('../models/Resume');
const JobRole = require('../models/JobRole');
const Course = require('../models/Course');
const { applyFallbackParsing } = require('../services/fallbackResumeAnalyzer');

exports.createAnalysis = async (req, res) => {
  try {
    const { resumeId, targetJobRoleId } = req.body;

    console.log('📊 Creating analysis:', { resumeId, targetJobRoleId });

    if (!resumeId || !targetJobRoleId) {
      return res.status(400).json({
        status: 'error',
        message: 'Resume ID and target job role ID are required'
      });
    }

    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user.id
    });

    if (!resume) {
      return res.status(404).json({
        status: 'error',
        message: 'Resume not found'
      });
    }

    const jobRole = await JobRole.findById(targetJobRoleId);
    if (!jobRole) {
      return res.status(404).json({
        status: 'error',
        message: 'Job role not found'
      });
    }

    console.log('✅ Found resume and job role');

    await ensureResumeSkills(resume);

    // FIX: Use extracted_skills (from ML service)
    const resumeSkills = resume.parsedData?.extracted_skills || [];
    const requiredSkills = jobRole.requiredSkills || [];
    const preferredSkills = jobRole.preferredSkills || [];

    console.log('📋 Skills:', {
      resume: resumeSkills.length,
      resumeSkillsList: resumeSkills,
      required: requiredSkills.length,
      preferred: preferredSkills.length
    });

    const allJobSkills = [...new Set([...requiredSkills, ...preferredSkills])];
    const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
    
    const matchingSkills = allJobSkills.filter(skill =>
      resumeSkillsLower.includes(skill.toLowerCase())
    );
    
    const missingSkills = allJobSkills.filter(skill =>
      !resumeSkillsLower.includes(skill.toLowerCase())
    );

    const requiredMatches = requiredSkills.filter(skill =>
      resumeSkillsLower.includes(skill.toLowerCase())
    ).length;
    
    const preferredMatches = preferredSkills.filter(skill =>
      resumeSkillsLower.includes(skill.toLowerCase())
    ).length;

    const matchPercentage = requiredSkills.length > 0 
      ? Math.round(
          (requiredMatches / requiredSkills.length) * 70 +
          (preferredMatches / (preferredSkills.length || 1)) * 30
        )
      : 0;

    console.log('📊 Match calculation:', {
      matchPercentage,
      matchingSkills: matchingSkills.length,
      missingSkills: missingSkills.length
    });

    const recommendations = [];
    
    if (missingSkills.length > 0) {
      recommendations.push({
        title: 'Develop Missing Skills',
        description: `Focus on learning: ${missingSkills.slice(0, 5).join(', ')}${missingSkills.length > 5 ? ` and ${missingSkills.length - 5} more` : ''}`
      });
    }

    if (matchPercentage < 70) {
      recommendations.push({
        title: 'Enhance Your Profile',
        description: 'Add more relevant projects and experience showcasing these skills'
      });
    }

    if (resumeSkills.length < 10) {
      recommendations.push({
        title: 'Expand Skill Set',
        description: 'Add more technical skills to your resume for better ATS scores'
      });
    }

    let recommendedCourses = [];
    if (missingSkills.length > 0) {
      recommendedCourses = await Course.find({
        relatedSkills: { $in: missingSkills.map(s => new RegExp(s, 'i')) },
        isActive: true
      })
      .sort({ rating: -1 })
      .limit(6)
      .select('title platform instructor url duration difficulty rating price relatedSkills');
    }

    console.log('📚 Found', recommendedCourses.length, 'recommended courses');

    const overallFeedback = matchPercentage >= 70
      ? 'Strong match! Your skills align well with the requirements for this role.'
      : matchPercentage >= 50
      ? 'Good match with room for improvement in key areas.'
      : 'Consider developing the missing skills to strengthen your candidacy for this role.';

    const strengths = matchingSkills.length > 0 ? matchingSkills.slice(0, 5) : ['No matching skills found'];
    const improvements = missingSkills.length > 0 ? missingSkills.slice(0, 5) : [];

    // FIX: Read final_ats_score correctly
    const atsScore = resume.parsedData?.final_ats_score || resume.parsedData?.ats_score || 0;
    const scoreBreakdown = resume.parsedData?.score_breakdown || {};

    console.log('🎯 ATS Data from resume:', {
      atsScore,
      hasBreakdown: Object.keys(scoreBreakdown).length > 0,
      parsedDataKeys: Object.keys(resume.parsedData || {})
    });

    const analysis = await Analysis.create({
      userId: req.user.id,
      resumeId: resumeId,
      targetJobRoleId: targetJobRoleId,
      matchPercentage: matchPercentage,
      matchingSkills: matchingSkills,
      missingSkills: missingSkills,
      recommendations: recommendations,
      recommendedCourses: recommendedCourses.map(c => c._id),
      feedback: {
        overallAssessment: overallFeedback,
        strengths: strengths,
        improvements: improvements,
        atsScore: atsScore,
        scoreBreakdown: scoreBreakdown
      }
    });

    await analysis.populate('targetJobRoleId');
    await analysis.populate('recommendedCourses');

    console.log('✅ Analysis created:', analysis._id);
    console.log('✅ Final ATS Score saved:', analysis.feedback.atsScore);

    res.status(201).json({
      status: 'success',
      message: 'Analysis completed successfully',
      data: {
        analysis: {
          id: analysis._id,
          matchPercentage: analysis.matchPercentage,
          matchingSkills: analysis.matchingSkills,
          missingSkills: analysis.missingSkills,
          recommendations: analysis.recommendations,
          recommendedCourses: analysis.recommendedCourses,
          targetJobRole: analysis.targetJobRoleId,
          feedback: analysis.feedback,
          createdAt: analysis.createdAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating analysis',
      error: error.message
    });
  }
};

exports.getAllAnalyses = async (req, res) => {
  try {
    const analyses = await Analysis.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('targetJobRoleId', 'title category')
      .populate('resumeId', 'originalName uploadedAt');

    res.status(200).json({
      status: 'success',
      data: {
        count: analyses.length,
        analyses: analyses
      }
    });
  } catch (error) {
    console.error('Get analyses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching analyses'
    });
  }
};

exports.getAnalysisById = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user.id
    })
    .populate('targetJobRoleId')
    .populate('resumeId')
    .populate('recommendedCourses');

    if (!analysis) {
      return res.status(404).json({
        status: 'error',
        message: 'Analysis not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { analysis }
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching analysis'
    });
  }
};

exports.deleteAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!analysis) {
      return res.status(404).json({
        status: 'error',
        message: 'Analysis not found'
      });
    }

    await Analysis.deleteOne({ _id: req.params.id });

    res.status(200).json({
      status: 'success',
      message: 'Analysis deleted successfully'
    });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting analysis'
    });
  }
};

async function ensureResumeSkills(resume) {
  if (!resume) return;
  if (resume.parsedData?.extracted_skills?.length) {
    return;
  }

  if (!resume.filePath) {
    console.warn('⚠️ Resume missing file path, cannot hydrate skills');
    return;
  }

  try {
    await applyFallbackParsing(resume);
    console.log('✅ Resume skills hydrated via fallback analyzer');
  } catch (error) {
    console.error('⚠️ Unable to hydrate resume skills:', error.message);
  }
}
