const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// @route   GET /api/analytics/overview
// @desc    Get comprehensive analytics overview
// @access  Private
router.get('/overview', auth, analyticsController.getAnalyticsOverview);

// @route   GET /api/analytics/monthly-activity
// @desc    Get monthly activity data
// @access  Private
router.get('/monthly-activity', auth, analyticsController.getMonthlyActivity);

// @route   GET /api/analytics/skills-distribution
// @desc    Get skill distribution data
// @access  Private
router.get('/skills-distribution', auth, analyticsController.getSkillsDistribution);

module.exports = router;
