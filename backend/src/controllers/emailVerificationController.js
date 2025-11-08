const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Debug: Check if email credentials are loaded
console.log('📧 Email Configuration:');
console.log('   EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing');

// Configure email transporter (using Gmail - you can change this)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASSWORD // App password (not regular password)
  }
});

/**
 * @route   POST /api/auth/send-verification
 * @desc    Send email verification link
 * @access  Private
 */
const sendVerificationEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is already verified'
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiry = verificationTokenExpiry;
    await user.save();

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Verify Your Email - CareerPath360',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #13A8A8 0%, #18B3B3 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 15px 30px; background: #13A8A8; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to CareerPath360!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name},</h2>
              <p>Thanks for signing up! We're excited to help you optimize your career path.</p>
              <p>Please verify your email address by clicking the button below:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create this account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 CareerPath360. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      status: 'success',
      message: 'Verification email sent successfully',
      data: {
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Send verification email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send verification email',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification token is required'
      });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification token'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully! You can now access all features.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: user.isEmailVerified
        }
      }
    });

  } catch (error) {
    console.error('❌ Verify email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify email',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/auth/check-verification
 * @desc    Check if user's email is verified
 * @access  Private
 */
const checkEmailVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('isEmailVerified email');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        isEmailVerified: user.isEmailVerified,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Check verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check verification status',
      error: error.message
    });
  }
};

module.exports = {
  sendVerificationEmail,
  verifyEmail,
  checkEmailVerification
};
