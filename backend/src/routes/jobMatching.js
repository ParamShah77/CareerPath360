const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const jobMatchingController = require('../controllers/jobMatchingController');

// @route   POST /api/job-matching/analyze
// @desc    Analyze job posting from URL
// @access  Private
router.post('/analyze', auth, jobMatchingController.analyzeJobPosting);

// @route   POST /api/job-matching/analyze-with-upload
// @desc    Upload resume and analyze job posting
// @access  Private
router.post('/analyze-with-upload', auth, upload.single('resume'), jobMatchingController.analyzeWithUpload);

// @route   GET /api/job-matching/history
// @desc    Get user's job analysis history
// @access  Private
router.get('/history', auth, jobMatchingController.getJobAnalysisHistory);

// @route   GET /api/job-matching/:id
// @desc    Get single job analysis
// @access  Private
router.get('/:id', auth, jobMatchingController.getJobAnalysis);

// @route   DELETE /api/job-matching/:id
// @desc    Delete job analysis
// @access  Private
router.delete('/:id', auth, jobMatchingController.deleteJobAnalysis);

module.exports = router;
