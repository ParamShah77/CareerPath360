const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const Resume = require('../models/Resume');
const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

// ===== RESUME UPLOAD & MANAGEMENT ROUTES =====
router.post('/upload', auth, upload.single('resume'), resumeController.uploadResume);
router.get('/', auth, resumeController.getAllResumes);
router.get('/get/:id', auth, resumeController.getResumeById);

// ===== RESUME BUILDER ROUTES =====
router.post('/build', auth, resumeController.buildResume);
router.get('/built/all', auth, resumeController.getAllBuiltResumes);
router.get('/built/:id', auth, resumeController.getBuiltResume);
router.put('/built/:id', auth, resumeController.updateBuiltResume);

// ===== AI OPTIMIZATION =====
router.post('/ai-optimize', auth, resumeController.aiOptimizeResume);

// ===== EXPORT ROUTES =====
router.post('/export-pdf', auth, resumeController.exportResumePDF);
router.post('/export-html', auth, resumeController.exportResumeHTML);

// ===== CURRENT RESUME =====
router.get('/my-resume', auth, resumeController.getMyResume);

// ===== DELETE ROUTES =====

// ✅ CLEANUP old test resumes (must come BEFORE other delete routes)
router.delete('/cleanup', auth, resumeController.cleanupOldResumes);

// ✅ DELETE all user's uploaded resumes (must come BEFORE /:id route)
router.delete('/clear/all', auth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('🗑️ Clearing all uploaded resumes for user:', userId);

    // Get resumes before deleting (for file cleanup)
    const resumesToDelete = await Resume.find({
      userId,
      isBuiltResume: false
    });

    // Delete physical files
    for (const resume of resumesToDelete) {
      if (resume.fileName) {
        const filePath = path.join(__dirname, '../../uploads', resume.fileName);
        try {
          await fs.unlink(filePath);
          console.log('✅ File deleted:', resume.fileName);
        } catch (err) {
          console.error('⚠️ Error deleting file:', err.message);
        }
      }
    }

    // ✅ Hard delete only UPLOADED resumes (not built ones)
    const result = await Resume.deleteMany({
      userId,
      isBuiltResume: false
    });

    console.log(`✅ Deleted ${result.deletedCount} uploaded resumes`);

    // ✅ Update user stats
    try {
      const user = await User.findById(userId);
      if (user) {
        console.log('🔄 Forcing stats refresh after bulk delete...');
        user.stats.lastUpdated = new Date(0); // Force refresh
        await user.save();
      }
    } catch (statsError) {
      console.error('⚠️ Stats update error:', statsError.message);
    }

    res.json({
      status: 'success',
      message: `Successfully deleted ${result.deletedCount} uploaded resume(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Clear all resumes error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to clear resumes'
    });
  }
});

// ✅ DELETE all built resumes
router.delete('/built/clear/all', auth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('🗑️ Clearing all built resumes for user:', userId);

    // ✅ Hard delete only BUILT resumes
    const result = await Resume.deleteMany({
      userId,
      isBuiltResume: true
    });

    console.log(`✅ Deleted ${result.deletedCount} built resumes`);

    // ✅ Update user stats
    try {
      const user = await User.findById(userId);
      if (user) {
        console.log('🔄 Forcing stats refresh after bulk delete...');
        user.stats.lastUpdated = new Date(0); // Force refresh
        await user.save();
      }
    } catch (statsError) {
      console.error('⚠️ Stats update error:', statsError.message);
    }

    res.json({
      status: 'success',
      message: `Successfully deleted ${result.deletedCount} built resume(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Clear built resumes error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to clear built resumes'
    });
  }
});

// ✅ DELETE built resume by ID
router.delete('/built/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('🗑️ Deleting built resume:', id, 'for user:', userId);

    // Find and delete
    const result = await Resume.findOneAndDelete({
      _id: id,
      userId,
      isBuiltResume: true
    });

    if (!result) {
      console.log('❌ Built resume not found or user does not own it');
      return res.status(404).json({
        status: 'error',
        message: 'Built resume not found or access denied'
      });
    }

    console.log('✅ Built resume deleted:', {
      id: result._id,
      name: result.resumeName || result.originalName
    });

    // ✅ Update user stats
    try {
      const user = await User.findById(userId);
      if (user) {
        console.log('🔄 Forcing stats refresh after delete...');
        user.stats.lastUpdated = new Date(0); // Force refresh
        await user.save();
      }
    } catch (statsError) {
      console.error('⚠️ Stats update error:', statsError.message);
    }

    res.json({
      status: 'success',
      message: 'Built resume deleted successfully',
      deletedResume: {
        id: result._id,
        name: result.resumeName || result.originalName,
        type: 'built',
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Delete built resume error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid resume ID format'
      });
    }

    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete built resume'
    });
  }
});

// ✅ DELETE a single resume by ID (works for both uploaded and built)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('🗑️ Deleting resume:', id, 'for user:', userId);

    // Find the resume first to check type
    const resume = await Resume.findOne({
      _id: id,
      userId
    });

    if (!resume) {
      console.log('❌ Resume not found or user does not own it');
      return res.status(404).json({
        status: 'error',
        message: 'Resume not found or access denied'
      });
    }

    // Delete physical file if it's an uploaded resume
    if (!resume.isBuiltResume && resume.fileName) {
      const filePath = path.join(__dirname, '../../uploads', resume.fileName);
      try {
        await fs.unlink(filePath);
        console.log('✅ File deleted:', resume.fileName);
      } catch (err) {
        console.error('⚠️ Error deleting file:', err.message);
      }
    }

    // ✅ Delete from MongoDB
    await Resume.deleteOne({ _id: id });

    console.log('✅ Resume deleted successfully:', {
      id: resume._id,
      name: resume.originalName || resume.resumeName || 'Resume',
      type: resume.isBuiltResume ? 'built' : 'uploaded'
    });

    // ✅ Update user stats
    try {
      const user = await User.findById(userId);
      if (user) {
        console.log('📊 Updating user stats after delete...');

        if (resume.isBuiltResume) {
          // Just force refresh for built resumes
          user.stats.lastUpdated = new Date(0);
        } else {
          // For uploaded resumes, recalculate stats immediately
          const remainingResumes = await Resume.find({
            userId,
            isBuiltResume: false,
            deleted: { $ne: true }
          });

          const scores = remainingResumes
            .map(r => r.atsScore || r.parsedData?.final_ats_score || 0)
            .filter(s => s > 0);

          const avgScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
            : 0;

          const oneWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const thisWeekCount = remainingResumes.filter(
            r => new Date(r.createdAt) > oneWeek
          ).length;

          await user.updateStats({
            resumesAnalyzed: remainingResumes.length,
            resumesThisWeek: thisWeekCount,
            averageMatchScore: avgScore,
            totalUploadedResumes: remainingResumes.length
          });

          console.log('✅ Stats updated:', {
            resumesAnalyzed: remainingResumes.length,
            avgScore: avgScore,
            thisWeek: thisWeekCount
          });
        }

        await user.save();
      }
    } catch (statsError) {
      console.error('⚠️ Stats update error:', statsError.message);
      // Don't fail the delete if stats update fails
    }

    res.json({
      status: 'success',
      message: 'Resume deleted successfully',
      deletedResume: {
        id: resume._id,
        name: resume.originalName || resume.resumeName || 'Resume',
        type: resume.isBuiltResume ? 'built' : 'uploaded',
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Delete resume error:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid resume ID format'
      });
    }

    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete resume'
    });
  }
});

// ===== DYNAMIC RESUME GET (must be at the end) =====
router.get('/:id', auth, resumeController.getResumeById);

module.exports = router;
