const Resume = require('../models/Resume');
const User = require('../models/User');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      console.error('❌ No userId found in request');
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('📊 Fetching dashboard stats for user:', userId);

    // ✅ Get user with stats
    const user = await User.findById(userId).catch(err => {
      console.error('❌ Error fetching user:', err);
      return null;
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // ✅ Check if force refresh is requested via query param
    const forceRefresh = req.query.refresh === 'true';
    
    // ✅ Check if cached stats are fresh (< 5 minutes old)
    if (user.stats && !user.needsStatsRefresh() && !forceRefresh) {
      console.log('📊 Returning cached stats (fresh, age:', 
        Math.round((Date.now() - new Date(user.stats.lastUpdated).getTime()) / 1000), 'seconds)');
      return res.json({
        status: 'success',
        data: user.stats,
        cached: true,
        lastUpdated: user.stats.lastUpdated
      });
    }

    // ✅ Calculate fresh stats if cache is stale or doesn't exist
    console.log('🔄 Calculating fresh stats from database...', forceRefresh ? '(FORCE REFRESH)' : '');

    // Get ONLY uploaded resumes (not built) AND not deleted
    const uploadedResumes = await Resume.find({
      userId,
      isBuiltResume: false,
      deleted: { $ne: true }
    }).catch(err => {
      console.error('❌ DB Error fetching uploaded resumes:', err);
      return [];
    });

    // Get built resumes (for separate count)
    const builtResumes = await Resume.find({
      userId,
      isBuiltResume: true,
      deleted: { $ne: true }
    }).catch(err => {
      console.error('❌ DB Error fetching built resumes:', err);
      return [];
    });

    const totalResumes = uploadedResumes.length;
    console.log('📄 Total uploaded resumes:', totalResumes);
    console.log('🔨 Total built resumes:', builtResumes.length);
    
    // Debug: Log resume details to find the issue
    console.log('🔍 DEBUG - Uploaded resume names:', uploadedResumes.map(r => ({
      name: r.originalName || r.resumeName || r.fileName,
      date: r.uploadedAt || r.createdAt,
      id: r._id
    })));
    console.log('🔍 DEBUG - Built resume names:', builtResumes.map(r => ({
      name: r.originalName || r.resumeName || r.fileName,
      date: r.createdAt,
      id: r._id
    })));

    // ✅ Calculate average ATS score from uploaded resumes
    const scores = uploadedResumes
      .map(r => r.atsScore || r.parsedData?.final_ats_score || 0)
      .filter(s => s > 0);
    
    const avgScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
      : 0;

    console.log('📊 Average ATS score:', avgScore, '(from', scores.length, 'resumes)');

    // ✅ Get resumes from last 7 days (both types)
    const oneWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const uploadedThisWeek = uploadedResumes.filter(
      r => new Date(r.uploadedAt || r.createdAt) > oneWeek
    ).length;
    
    const builtThisWeek = builtResumes.filter(
      r => new Date(r.createdAt) > oneWeek
    ).length;
    
    const thisWeek = uploadedThisWeek + builtThisWeek;

    console.log('📅 This week:', thisWeek, '(Uploaded:', uploadedThisWeek, ', Built:', builtThisWeek + ')');

    // ✅ Calculate improvement (last week vs previous week)
    const twoWeeks = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const previousWeekResumes = uploadedResumes.filter(r => {
      const date = new Date(r.uploadedAt || r.createdAt);
      return date > twoWeeks && date <= oneWeek;
    });

    const prevScores = previousWeekResumes
      .map(r => r.atsScore || r.parsedData?.final_ats_score || 0)
      .filter(s => s > 0);
    
    const prevAvg = prevScores.length > 0
      ? Math.round(prevScores.reduce((a, b) => a + b) / prevScores.length)
      : avgScore;
    
    const improvement = avgScore - prevAvg;

    console.log('📈 Score improvement:', improvement);

    // ✅ Get target roles from user
    const targetRoles = user.targetRoles || [];
    const activeTargetRoles = targetRoles.filter(r => r.active !== false).length;

    // ✅ Calculate skills from uploaded resumes
    const allSkills = new Set();
    uploadedResumes.forEach(resume => {
      const skills = resume.parsedData?.extracted_skills || [];
      skills.forEach(skill => allSkills.add(skill));
    });

    const coursesRecommended = Math.min(allSkills.size * 2, 25);
    const coursesCompleted = user.coursesCompleted || 0;

    // ✅ Build stats object
    const statsData = {
      resumesAnalyzed: totalResumes,
      resumesThisWeek: thisWeek,
      averageMatchScore: avgScore,
      scoreImprovement: improvement,
      targetRoles: targetRoles.length,
      activeTargetRoles: activeTargetRoles,
      coursesRecommended: coursesRecommended,
      coursesCompleted: coursesCompleted,
      totalBuiltResumes: builtResumes.length,
      totalUploadedResumes: totalResumes,
      skillsIdentified: allSkills.size,
      lastUpdated: new Date()
    };

    console.log('✅ Fresh stats calculated:', {
      uploaded: statsData.resumesAnalyzed,
      built: statsData.totalBuiltResumes,
      avgScore: statsData.averageMatchScore,
      improvement: statsData.scoreImprovement,
      thisWeek: statsData.resumesThisWeek
    });

    // ✅ Cache stats in user profile
    try {
      await user.updateStats(statsData);
      console.log('💾 Stats cached in user profile');
    } catch (cacheError) {
      console.error('⚠️ Failed to cache stats:', cacheError);
      // Continue anyway, return fresh stats
    }

    res.json({
      status: 'success',
      data: statsData,
      cached: false,
      lastUpdated: statsData.lastUpdated
    });

  } catch (error) {
    console.error('❌ Error in getDashboardStats:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch dashboard stats'
    });
  }
};

// @desc    Force refresh dashboard stats
// @route   POST /api/dashboard/stats/refresh
// @access  Private
exports.refreshDashboardStats = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    console.log('🔄 Force refreshing stats for user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Reset lastUpdated to force recalculation
    if (user.stats) {
      user.stats.lastUpdated = new Date(0); // Set to epoch
      await user.save();
    }

    // Call getDashboardStats to recalculate
    return exports.getDashboardStats(req, res);
  } catch (error) {
    console.error('❌ Refresh stats error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Get recent activity
// @route   GET /api/dashboard/activity
// @access  Private
exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const limit = parseInt(req.query.limit) || 10;

    console.log('📋 Fetching recent activity for user:', userId);

    // ✅ Get only non-deleted resumes (both types)
    const resumes = await Resume.find({ 
      userId,
      deleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .catch(err => {
        console.error('❌ DB Error:', err);
        return [];
      });

    const activity = resumes.map(resume => ({
      id: resume._id,
      type: resume.isBuiltResume ? 'built' : 'uploaded',
      name: resume.originalName || resume.builtResumeData?.personalInfo?.fullName || 'Unnamed Resume',
      atsScore: resume.atsScore || resume.parsedData?.final_ats_score || 0,
      status: resume.parseStatus || 'completed',
      date: resume.createdAt || resume.uploadedAt,
      template: resume.selectedTemplate || null
    }));

    console.log('✅ Found', activity.length, 'recent activities');

    res.json({
      status: 'success',
      data: { activity }
    });
  } catch (error) {
    console.error('❌ Recent activity error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Get ATS score trends (UPLOADED RESUMES ONLY)
// @route   GET /api/dashboard/trends
// @access  Private
exports.getATSTrends = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const days = parseInt(req.query.days) || 30;

    console.log('📈 Fetching ATS trends for', days, 'days');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // ✅ Get only non-deleted UPLOADED resumes
    const resumes = await Resume.find({
      userId,
      isBuiltResume: false,
      deleted: { $ne: true },
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    const trends = resumes.map(resume => ({
      date: resume.createdAt || resume.uploadedAt,
      score: resume.atsScore || resume.parsedData?.final_ats_score || 0,
      name: resume.originalName
    }));

    // Calculate weekly averages
    const weeklyAverages = {};
    trends.forEach(item => {
      const week = getWeekNumber(new Date(item.date));
      if (!weeklyAverages[week]) {
        weeklyAverages[week] = { total: 0, count: 0 };
      }
      weeklyAverages[week].total += item.score;
      weeklyAverages[week].count += 1;
    });

    const weeklyTrends = Object.entries(weeklyAverages).map(([week, data]) => ({
      week: parseInt(week),
      averageScore: Math.round(data.total / data.count)
    }));

    console.log('✅ Trends calculated for', trends.length, 'resumes');

    res.json({
      status: 'success',
      data: {
        trends,
        weeklyTrends
      }
    });
  } catch (error) {
    console.error('❌ Trends error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Get skill gap analysis
// @route   GET /api/dashboard/skills-gap
// @access  Private
exports.getSkillsGap = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetRole = req.query.role;

    console.log('🎯 Analyzing skills gap for role:', targetRole);

    // ✅ Get only non-deleted UPLOADED resumes
    const resumes = await Resume.find({ 
      userId, 
      isBuiltResume: false,
      deleted: { $ne: true }
    });

    // Extract all skills
    const userSkills = new Set();
    resumes.forEach(resume => {
      const skills = resume.parsedData?.extracted_skills || [];
      skills.forEach(skill => userSkills.add(skill.toLowerCase()));
    });

    // Role-based required skills
    const roleSkillsMap = {
      'Software Engineer': ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'AWS', 'Docker'],
      'Data Scientist': ['Python', 'R', 'SQL', 'Machine Learning', 'Statistics', 'Pandas', 'TensorFlow', 'PyTorch'],
      'Product Manager': ['Agile', 'Scrum', 'JIRA', 'Product Strategy', 'User Research', 'Analytics', 'Roadmap'],
      'DevOps Engineer': ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Linux', 'Terraform', 'Jenkins', 'Ansible'],
      'Frontend Developer': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'TypeScript', 'Webpack', 'Sass'],
      'Backend Developer': ['Node.js', 'Python', 'Java', 'SQL', 'MongoDB', 'REST API', 'GraphQL', 'Redis'],
      'Full Stack Developer': ['JavaScript', 'React', 'Node.js', 'SQL', 'MongoDB', 'REST API', 'Git', 'Docker'],
      'Data Analyst': ['SQL', 'Python', 'Excel', 'Tableau', 'Power BI', 'Statistics', 'Data Visualization'],
      'UI/UX Designer': ['Figma', 'Adobe XD', 'Sketch', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
      'Mobile Developer': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase', 'REST API', 'Mobile UI/UX']
    };

    const requiredSkills = roleSkillsMap[targetRole] || [];
    const missingSkills = requiredSkills.filter(
      skill => !userSkills.has(skill.toLowerCase())
    );
    const matchedSkills = requiredSkills.filter(
      skill => userSkills.has(skill.toLowerCase())
    );

    console.log('✅ Skills gap analyzed:', {
      userSkills: userSkills.size,
      required: requiredSkills.length,
      matched: matchedSkills.length,
      missing: missingSkills.length
    });

    res.json({
      status: 'success',
      data: {
        targetRole: targetRole || 'General',
        userSkills: Array.from(userSkills),
        requiredSkills,
        matchedSkills,
        missingSkills,
        matchPercentage: requiredSkills.length > 0
          ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('❌ Skills gap error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Helper function to get week number
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

module.exports = {
  getDashboardStats: exports.getDashboardStats,
  refreshDashboardStats: exports.refreshDashboardStats,
  getRecentActivity: exports.getRecentActivity,
  getATSTrends: exports.getATSTrends,
  getSkillsGap: exports.getSkillsGap
};