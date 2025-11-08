const Resume = require('../models/Resume');
const Analysis = require('../models/Analysis');
const JobAnalysis = require('../models/JobAnalysis');

// @desc    Get comprehensive analytics data
// @route   GET /api/analytics/overview
// @access  Private
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all resumes
    const resumes = await Resume.find({ userId }).sort({ uploadedAt: -1, createdAt: -1 });
    
    // Get all analyses
    const analyses = await Analysis.find({ userId }).sort({ analyzedAt: -1 });
    
    // Get all job analyses
    const jobAnalyses = await JobAnalysis.find({ userId }).sort({ createdAt: -1 });

    // Calculate ATS score trend from analyses
    const atsScoreTrend = analyses.map(analysis => ({
      date: analysis.analyzedAt,
      score: analysis.atsScore || analysis.parsedData?.final_ats_score || 0,
      resumeName: analysis.resumeId?.originalName || 'Unknown'
    })).filter(item => item.score > 0);

    // Also get ATS scores directly from resumes (fallback)
    if (atsScoreTrend.length === 0) {
      resumes.forEach(resume => {
        const score = resume.parsedData?.final_ats_score || resume.atsScore;
        if (score && score > 0) {
          atsScoreTrend.push({
            date: resume.uploadedAt || resume.createdAt,
            score: score,
            resumeName: resume.originalName || resume.resumeName || 'Unnamed Resume'
          });
        }
      });
    }

    // Calculate job match trend
    const jobMatchTrend = jobAnalyses.map(job => ({
      date: job.createdAt,
      matchScore: job.matchScore || 0,
      jobTitle: job.jobTitle,
      company: job.companyName
    }));

    // Resume statistics
    const totalResumes = resumes.length;
    const uploadedResumes = resumes.filter(r => !r.isBuiltResume).length;
    const builtResumes = resumes.filter(r => r.isBuiltResume).length;

    // ATS statistics
    const atsScores = atsScoreTrend.map(t => t.score);
    const averageAtsScore = atsScores.length > 0 
      ? Math.round(atsScores.reduce((a, b) => a + b, 0) / atsScores.length)
      : 0;
    const bestAtsScore = atsScores.length > 0 ? Math.max(...atsScores) : 0;
    const latestAtsScore = atsScores.length > 0 ? atsScores[0] : 0;

    // Job match statistics
    const matchScores = jobMatchTrend.map(j => j.matchScore);
    const averageMatchScore = matchScores.length > 0
      ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length)
      : 0;
    const bestMatchScore = matchScores.length > 0 ? Math.max(...matchScores) : 0;

    // Skills analysis
    let allSkills = [];
    resumes.forEach(resume => {
      if (resume.parsedData?.extracted_skills) {
        allSkills = [...allSkills, ...resume.parsedData.extracted_skills];
      }
      if (resume.builtResumeData?.skills) {
        const skills = resume.builtResumeData.skills;
        allSkills = [
          ...allSkills,
          ...(skills.technical || []),
          ...(skills.tools || []),
          ...(skills.soft || [])
        ];
      }
    });
    const uniqueSkills = [...new Set(allSkills)];

    // Activity timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = {
      resumesUploaded: resumes.filter(r => 
        new Date(r.uploadedAt || r.createdAt) >= thirtyDaysAgo
      ).length,
      analysesRun: analyses.filter(a => 
        new Date(a.analyzedAt) >= thirtyDaysAgo
      ).length,
      jobsAnalyzed: jobAnalyses.filter(j => 
        new Date(j.createdAt) >= thirtyDaysAgo
      ).length
    };

    return res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalResumes,
          uploadedResumes,
          builtResumes,
          totalAnalyses: analyses.length,
          totalJobAnalyses: jobAnalyses.length,
          uniqueSkills: uniqueSkills.length,
          averageAtsScore,
          bestAtsScore,
          latestAtsScore,
          averageMatchScore,
          bestMatchScore
        },
        trends: {
          atsScoreTrend: atsScoreTrend.slice(0, 10), // Last 10 analyses
          jobMatchTrend: jobMatchTrend.slice(0, 10)  // Last 10 job analyses
        },
        activity: recentActivity,
        skills: uniqueSkills.slice(0, 20) // Top 20 skills
      }
    });

  } catch (error) {
    console.error('❌ Analytics error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
};

// @desc    Get monthly activity data
// @route   GET /api/analytics/monthly-activity
// @access  Private
exports.getMonthlyActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { months = 6 } = req.query;

    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months));

    // Get resumes by month
    const resumes = await Resume.find({
      userId,
      $or: [
        { uploadedAt: { $gte: monthsAgo } },
        { createdAt: { $gte: monthsAgo } }
      ]
    });

    // Get analyses by month
    const analyses = await Analysis.find({
      userId,
      analyzedAt: { $gte: monthsAgo }
    });

    // Group by month
    const monthlyData = {};
    
    for (let i = 0; i < parseInt(months); i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = {
        month: monthKey,
        resumes: 0,
        analyses: 0
      };
    }

    // Count resumes
    resumes.forEach(resume => {
      const date = new Date(resume.uploadedAt || resume.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].resumes++;
      }
    });

    // Count analyses
    analyses.forEach(analysis => {
      const date = new Date(analysis.analyzedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].analyses++;
      }
    });

    const activityData = Object.values(monthlyData).reverse();

    return res.status(200).json({
      status: 'success',
      data: {
        monthlyActivity: activityData
      }
    });

  } catch (error) {
    console.error('❌ Monthly activity error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch monthly activity',
      error: error.message
    });
  }
};

// @desc    Get skill distribution
// @route   GET /api/analytics/skills-distribution
// @access  Private
exports.getSkillsDistribution = async (req, res) => {
  try {
    const userId = req.user.id;

    const resumes = await Resume.find({ userId });

    let technicalSkills = [];
    let softSkills = [];
    let tools = [];

    resumes.forEach(resume => {
      if (resume.builtResumeData?.skills) {
        const skills = resume.builtResumeData.skills;
        technicalSkills = [...technicalSkills, ...(skills.technical || [])];
        softSkills = [...softSkills, ...(skills.soft || [])];
        tools = [...tools, ...(skills.tools || [])];
      }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        distribution: [
          { name: 'Technical Skills', value: [...new Set(technicalSkills)].length },
          { name: 'Soft Skills', value: [...new Set(softSkills)].length },
          { name: 'Tools & Technologies', value: [...new Set(tools)].length }
        ]
      }
    });

  } catch (error) {
    console.error('❌ Skills distribution error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch skills distribution',
      error: error.message
    });
  }
};

module.exports = {
  getAnalyticsOverview: exports.getAnalyticsOverview,
  getMonthlyActivity: exports.getMonthlyActivity,
  getSkillsDistribution: exports.getSkillsDistribution
};
