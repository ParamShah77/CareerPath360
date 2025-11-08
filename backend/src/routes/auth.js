const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const emailVerificationController = require('../controllers/emailVerificationController');
const passwordResetController = require('../controllers/passwordResetController');
const { auth } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, authController.getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, authController.updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, authController.changePassword);

// ✅ Email Verification Routes
// @route   POST /api/auth/send-verification
// @desc    Send email verification link
// @access  Private
router.post('/send-verification', auth, emailVerificationController.sendVerificationEmail);

// @route   POST /api/auth/verify-email
// @desc    Verify email with token
// @access  Public
router.post('/verify-email', emailVerificationController.verifyEmail);

// @route   GET /api/auth/check-verification
// @desc    Check if user's email is verified
// @access  Private
router.get('/check-verification', auth, emailVerificationController.checkEmailVerification);

// ✅ Password Reset Routes
// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', passwordResetController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', passwordResetController.resetPassword);

// @route   POST /api/auth/validate-reset-token
// @desc    Validate if reset token is valid
// @access  Public
router.post('/validate-reset-token', passwordResetController.validateResetToken);

module.exports = router;


