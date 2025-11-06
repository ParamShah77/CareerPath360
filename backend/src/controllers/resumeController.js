const Resume = require('../models/Resume');
const User = require('../models/User');
const Notification = require('../models/Notification');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// ====================================
// 📤 RESUME UPLOAD & PARSING
// ====================================

// @desc    Upload resume (PDF/DOCX) and parse with ML
// @route   POST /api/resume/upload
// @access  Private
exports.uploadResume = async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('User:', req.user?.id);
    console.log('File:', req.file?.originalname);

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a file'
      });
    }

    const userId = req.user.id || req.user.userId;
    const { originalname, mimetype, size, buffer } = req.file;
    const fileType = mimetype === 'application/pdf' ? 'pdf' : 'docx';
    const fileName = `${userId}_${Date.now()}${path.extname(originalname)}`;
    
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, buffer);
    
    console.log('✅ File saved:', fileName);

    const resume = await Resume.create({
      userId: userId,
      fileName: fileName,
      originalName: originalname,
      fileUrl: `/uploads/${fileName}`,
      fileSize: size,
      fileType: fileType,
      parseStatus: 'processing',
      parsedData: {},
      isBuiltResume: false
    });

    console.log('✅ Resume created in DB:', resume._id);

    // 🔔 Create upload notification
    try {
      await Notification.createNotification({
        userId,
        type: 'resume_uploaded',
        title: 'Resume Uploaded Successfully',
        message: `Your resume "${originalname}" has been uploaded and is being analyzed`,
        link: `/history`,
        icon: '📄',
        metadata: {
          resumeId: resume._id
        }
      });
    } catch (notifError) {
      console.error('⚠️ Notification error:', notifError.message);
    }

    // Parse with ML service (async)
    try {
      const formData = new FormData();
      formData.append('file', fsSync.createReadStream(filePath));

      console.log('🤖 Calling ML service...');

      const mlResponse = await axios.post(
        'http://localhost:8000/parse-resume',
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );

      console.log('📊 ML Response received');

      if (mlResponse.data && mlResponse.data.success) {
        const mlData = mlResponse.data.data;
        
        resume.parsedData = mlData;
        resume.parseStatus = 'completed';
        resume.atsScore = mlData.final_ats_score || 0;
        await resume.save();
        
        console.log('✅ ML parsing complete');
        console.log('🎯 ATS Score:', mlData.final_ats_score);
        
        // 🔔 Create notifications
        try {
          // Analysis complete notification
          await Notification.createNotification({
            userId,
            type: 'analysis_complete',
            title: 'Resume Analysis Complete',
            message: `Your resume "${originalname}" has been analyzed with an ATS score of ${mlData.final_ats_score}%`,
            link: `/analysis/${resume._id}`,
            icon: '✅',
            metadata: {
              resumeId: resume._id,
              atsScore: mlData.final_ats_score
            }
          });
          
          // High score notification (if score >= 80)
          if (mlData.final_ats_score >= 80) {
            await Notification.createNotification({
              userId,
              type: 'high_ats_score',
              title: 'Excellent ATS Score! 🎉',
              message: `Your resume achieved a high ATS score of ${mlData.final_ats_score}%! Great job!`,
              link: `/analysis/${resume._id}`,
              icon: '🎯',
              metadata: {
                resumeId: resume._id,
                atsScore: mlData.final_ats_score
              }
            });
          }
        } catch (notifError) {
          console.error('⚠️ Notification error:', notifError.message);
        }
      }
    } catch (mlError) {
      console.error('❌ ML Error:', mlError.message);
      resume.parseStatus = 'failed';
      resume.parseError = mlError.message;
      await resume.save();
    }

    // ✅ UPDATE USER STATS
    try {
      const user = await User.findById(userId);
      
      if (user) {
        console.log('📊 Updating user stats...');
        
        // Get all uploaded resumes
        const allResumes = await Resume.find({ 
          userId,
          isBuiltResume: false,
          deleted: { $ne: true }
        });
        
        // Calculate average score
        const scores = allResumes
          .map(r => r.atsScore || r.parsedData?.final_ats_score || 0)
          .filter(s => s > 0);
        
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
          : 0;
        
        // Count resumes this week
        const oneWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thisWeekCount = allResumes.filter(
          r => new Date(r.createdAt) > oneWeek
        ).length;
        
        // Update user stats
        await user.updateStats({
          resumesAnalyzed: allResumes.length,
          resumesThisWeek: thisWeekCount,
          averageMatchScore: avgScore,
          totalUploadedResumes: allResumes.length
        });
        
        console.log('✅ User stats updated:', {
          resumesAnalyzed: allResumes.length,
          avgScore: avgScore,
          thisWeek: thisWeekCount
        });
      }
    } catch (statsError) {
      console.error('⚠️ Stats update error:', statsError.message);
      // Don't fail the request if stats update fails
    }

    const finalResume = await Resume.findById(resume._id);

    res.status(201).json({
      status: 'success',
      message: 'Resume uploaded successfully',
      data: {
        resume: {
          id: finalResume._id,
          fileName: finalResume.originalName,
          fileSize: finalResume.fileSize,
          fileType: finalResume.fileType,
          uploadedAt: finalResume.createdAt,
          parseStatus: finalResume.parseStatus,
          atsScore: finalResume.atsScore || finalResume.parsedData?.final_ats_score || 0,
          skills: finalResume.parsedData?.extracted_skills || [],
          scoreBreakdown: finalResume.parsedData?.score_breakdown || {}
        }
      }
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ====================================
// 📝 RESUME BUILDER (CREATE/UPDATE)
// ====================================

// @desc    Build and save resume
// @route   POST /api/resume/build
// @access  Private
exports.buildResume = async (req, res) => {
  try {
    const { resumeName, builtResumeData, selectedTemplate } = req.body;
    const userId = req.user.id || req.user.userId;

    console.log('📝 Building resume for user:', userId);

    // Validation
    if (!resumeName) {
      return res.status(400).json({
        status: 'error',
        message: 'Resume name is required'
      });
    }

    if (!builtResumeData || !builtResumeData.personalInfo) {
      return res.status(400).json({
        status: 'error',
        message: 'Personal information is required'
      });
    }

    const { personalInfo } = builtResumeData;

    if (!personalInfo.fullName || !personalInfo.email || !personalInfo.phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Full name, email, and phone are required'
      });
    }

    const fileName = `resume_${userId}_${Date.now()}.json`;
    
    // Calculate initial ATS score
    const atsScore = calculateATSScore(builtResumeData);

    const resume = await Resume.create({
      userId: userId,
      resumeName: resumeName,
      fileName: fileName,
      originalName: `${personalInfo.fullName}_Resume`,
      fileUrl: `/resumes/${fileName}`,
      fileSize: JSON.stringify(builtResumeData).length,
      fileType: 'json',
      isBuiltResume: true,
      builtResumeData: builtResumeData,
      selectedTemplate: selectedTemplate || 'classic',
      parseStatus: 'completed',
      atsScore: atsScore,
      aiOptimized: false
    });

    console.log('✅ Resume built and saved:', resume._id);
    console.log('🎯 Initial ATS Score:', atsScore);

    // 🔔 Create resume built notification
    try {
      await Notification.createNotification({
        userId,
        type: 'resume_built',
        title: 'Resume Created Successfully',
        message: `Your resume "${name}" has been created with an ATS score of ${atsScore}%`,
        link: `/resume-builder?id=${resume._id}`,
        icon: '📝',
        metadata: {
          resumeId: resume._id,
          atsScore: atsScore
        }
      });
    } catch (notifError) {
      console.error('⚠️ Notification error:', notifError.message);
    }

    // ✅ UPDATE USER STATS
    try {
      const user = await User.findById(userId);
      
      if (user) {
        console.log('📊 Updating user stats for built resume...');
        
        // Get all built resumes
        const allBuiltResumes = await Resume.find({ 
          userId,
          isBuiltResume: true,
          deleted: { $ne: true }
        });
        
        // Count resumes this week (both types)
        const oneWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const uploadedResumes = await Resume.find({ 
          userId,
          isBuiltResume: false,
          deleted: { $ne: true }
        });
        
        const uploadedThisWeek = uploadedResumes.filter(
          r => new Date(r.createdAt) > oneWeek
        ).length;
        
        const builtThisWeek = allBuiltResumes.filter(
          r => new Date(r.createdAt) > oneWeek
        ).length;
        
        // Update user stats
        await user.updateStats({
          totalBuiltResumes: allBuiltResumes.length,
          resumesThisWeek: uploadedThisWeek + builtThisWeek
        });
        
        console.log('✅ User stats updated:', {
          totalBuilt: allBuiltResumes.length,
          thisWeek: uploadedThisWeek + builtThisWeek
        });
      }
    } catch (statsError) {
      console.error('⚠️ Stats update error:', statsError.message);
      // Don't fail the request if stats update fails
    }

    res.status(201).json({
      status: 'success',
      message: 'Resume saved successfully',
      data: {
        resume: {
          id: resume._id,
          resumeName: resume.resumeName,
          selectedTemplate: selectedTemplate,
          atsScore: atsScore,
          createdAt: resume.createdAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Build resume error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error building resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update built resume
// @route   PUT /api/resume/built/:id
// @access  Private
exports.updateBuiltResume = async (req, res) => {
  try {
    const { resumeName, builtResumeData, selectedTemplate } = req.body;
    const userId = req.user.id || req.user.userId;

    console.log('✏️ Updating resume:', req.params.id);

    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: userId,
      isBuiltResume: true
    });

    if (!resume) {
      return res.status(404).json({
        status: 'error',
        message: 'Built resume not found or you do not have permission to edit it'
      });
    }

    // Update fields
    if (resumeName) {
      resume.resumeName = resumeName;
    }

    if (builtResumeData) {
      resume.builtResumeData = builtResumeData;
      resume.originalName = `${builtResumeData.personalInfo.fullName}_Resume`;
      
      // Recalculate ATS score
      const atsScore = calculateATSScore(builtResumeData);
      resume.atsScore = atsScore;
      console.log('🎯 Updated ATS Score:', atsScore);
    }
    
    if (selectedTemplate) {
      resume.selectedTemplate = selectedTemplate;
    }

    await resume.save();

    console.log('✅ Resume updated:', resume._id);

    // ✅ REFRESH USER STATS (scores may have changed)
    try {
      const user = await User.findById(userId);
      if (user && user.needsStatsRefresh()) {
        console.log('🔄 Refreshing user stats after update...');
        user.stats.lastUpdated = new Date(0); // Force refresh
        await user.save();
      }
    } catch (statsError) {
      console.error('⚠️ Stats refresh error:', statsError.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'Resume updated successfully',
      data: {
        resume: {
          id: resume._id,
          resumeName: resume.resumeName,
          selectedTemplate: resume.selectedTemplate,
          atsScore: resume.atsScore,
          updatedAt: resume.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Update resume error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid resume ID format'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error updating resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ====================================
// 📋 GET RESUMES
// ====================================

// @desc    Get all uploaded resumes
// @route   GET /api/resume
// @access  Private
exports.getAllResumes = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const resumes = await Resume.find({ 
      userId: userId,
      isBuiltResume: false,
      deleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .select('-parsedData');

    res.status(200).json({
      status: 'success',
      data: {
        count: resumes.length,
        resumes: resumes.map(resume => ({
          id: resume._id,
          fileName: resume.originalName,
          fileSize: resume.fileSize,
          fileType: resume.fileType,
          parseStatus: resume.parseStatus,
          atsScore: resume.atsScore || 0,
          uploadedAt: resume.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('❌ Get resumes error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching resumes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all built resumes for user
// @route   GET /api/resume/built/all
// @access  Private
exports.getAllBuiltResumes = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const resumes = await Resume.find({
      userId: userId,
      isBuiltResume: true,
      deleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .select('_id resumeName originalName selectedTemplate createdAt updatedAt atsScore aiOptimized isBuiltResume');

    console.log('📋 Found', resumes.length, 'built resumes for user:', userId);

    res.status(200).json({
      status: 'success',
      data: {
        count: resumes.length,
        resumes: resumes.map(resume => ({
          id: resume._id,
          resumeName: resume.resumeName || resume.originalName,
          name: resume.resumeName || resume.originalName,
          selectedTemplate: resume.selectedTemplate,
          template: resume.selectedTemplate,
          atsScore: resume.atsScore || 0,
          aiOptimized: resume.aiOptimized || false,
          isBuiltResume: resume.isBuiltResume,
          createdAt: resume.createdAt,
          updatedAt: resume.updatedAt
        }))
      }
    });
  } catch (error) {
    console.error('❌ Get built resumes error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching resumes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get latest resume for user
// @route   GET /api/resume/my-resume
// @access  Private
exports.getMyResume = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const resume = await Resume.findOne({ 
      userId: userId,
      isBuiltResume: true 
    }).sort({ uploadedAt: -1 });

    if (!resume) {
      return res.status(200).json({
        status: 'success',
        data: null,
        message: 'No resume found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: resume.builtResumeData
    });
  } catch (error) {
    console.error('❌ Get my resume error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get resume by ID (supports both uploaded and built)
// @route   GET /api/resume/:id OR GET /api/resume/get/:id
// @access  Private
exports.getResumeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    console.log('🔍 Fetching resume:', id, 'for user:', userId);

    const resume = await Resume.findOne({ 
      _id: id, 
      userId: userId 
    });

    if (!resume) {
      console.log('❌ Resume not found');
      return res.status(404).json({
        status: 'error',
        message: 'Resume not found or you do not have permission to access it'
      });
    }

    console.log('✅ Resume found:', resume._id);
    console.log('📋 Resume type:', resume.isBuiltResume ? 'Built' : 'Uploaded');

    // Format response based on resume type
    if (resume.isBuiltResume) {
      return res.status(200).json({
        status: 'success',
        data: {
          resume: {
            id: resume._id,
            resumeName: resume.resumeName || resume.originalName,
            selectedTemplate: resume.selectedTemplate || 'classic',
            builtResumeData: resume.builtResumeData,
            atsScore: resume.atsScore || 0,
            aiOptimized: resume.aiOptimized || false,
            createdAt: resume.createdAt, // ✅ Change from uploadedAt
            updatedAt: resume.updatedAt
          }
        }
      });
    } else {
      return res.status(200).json({
        status: 'success',
        data: {
          resume: {
            id: resume._id,
            fileName: resume.originalName,
            fileType: resume.fileType,
            fileSize: resume.fileSize,
            fileUrl: resume.fileUrl,
            parseStatus: resume.parseStatus,
            parsedData: resume.parsedData,
            atsScore: resume.atsScore || resume.parsedData?.final_ats_score || 0,
            uploadedAt: resume.createdAt // ✅ Map for compatibility
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Error fetching resume:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid resume ID format'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Error fetching resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get built resume by ID
// @route   GET /api/resume/built/:id
// @access  Private
exports.getBuiltResume = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    console.log('🔍 Fetching built resume:', id);

    const resume = await Resume.findOne({
      _id: id,
      userId: userId,
      isBuiltResume: true
    });

    if (!resume) {
      console.log('❌ Built resume not found');
      return res.status(404).json({
        status: 'error',
        message: 'Built resume not found or you do not have permission to access it'
      });
    }

    console.log('✅ Built resume found:', resume._id);

    res.status(200).json({
      status: 'success',
      data: {
        resume: {
          id: resume._id,
          resumeName: resume.resumeName || resume.originalName,
          selectedTemplate: resume.selectedTemplate || 'classic',
          builtResumeData: resume.builtResumeData,
          atsScore: resume.atsScore || 0,
          aiOptimized: resume.aiOptimized || false,
          createdAt: resume.createdAt, // ✅ Change from uploadedAt
          updatedAt: resume.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching built resume:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid resume ID format'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error fetching resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ====================================
// 🗑️ DELETE RESUMES (with stats update)
// ====================================

// @desc    Delete uploaded resume
// @route   DELETE /api/resume/:id
// @access  Private
exports.deleteResume = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: userId
    });

    if (!resume) {
      return res.status(404).json({
        status: 'error',
        message: 'Resume not found or you do not have permission to delete it'
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

    await Resume.deleteOne({ _id: req.params.id });

    console.log('✅ Resume deleted:', req.params.id);

    // ✅ REFRESH USER STATS
    try {
      const user = await User.findById(userId);
      if (user) {
        console.log('🔄 Forcing stats refresh after delete...');
        user.stats.lastUpdated = new Date(0); // Force refresh on next stats request
        await user.save();
      }
    } catch (statsError) {
      console.error('⚠️ Stats refresh error:', statsError.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete resume error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete built resume
// @route   DELETE /api/resume/built/:id
// @access  Private
exports.deleteBuiltResume = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    console.log('🗑️ Delete request for built resume:', id);

    const resume = await Resume.findOneAndDelete({
      _id: id,
      userId: userId,
      isBuiltResume: true
    });

    if (!resume) {
      return res.status(404).json({
        status: 'error',
        message: 'Built resume not found or you do not have permission to delete it'
      });
    }

    console.log('✅ Built resume deleted:', id);

    // ✅ REFRESH USER STATS
    try {
      const user = await User.findById(userId);
      if (user) {
        console.log('🔄 Forcing stats refresh after delete...');
        user.stats.lastUpdated = new Date(0); // Force refresh
        await user.save();
      }
    } catch (statsError) {
      console.error('⚠️ Stats refresh error:', statsError.message);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Built resume deleted successfully',
      data: { id }
    });

  } catch (error) {
    console.error('❌ Error deleting built resume:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error deleting built resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cleanup old test resumes
// @route   DELETE /api/resume/cleanup
// @access  Private
exports.cleanupOldResumes = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { beforeDate, keepRecent } = req.query;

    console.log('🧹 Starting resume cleanup for user:', userId);

    let deleteQuery = { userId };

    // Option 1: Delete resumes before a specific date
    if (beforeDate) {
      deleteQuery.createdAt = { $lt: new Date(beforeDate) };
      console.log('📅 Deleting resumes before:', beforeDate);
    } 
    // Option 2: Keep only the most recent N resumes
    else if (keepRecent) {
      const keepCount = parseInt(keepRecent) || 5;
      
      // Get all resumes sorted by date
      const allResumes = await Resume.find({ userId })
        .sort({ createdAt: -1 });
      
      // Keep the most recent ones, delete the rest
      const resumesToDelete = allResumes.slice(keepCount);
      const idsToDelete = resumesToDelete.map(r => r._id);
      
      if (idsToDelete.length === 0) {
        return res.json({
          status: 'success',
          message: `No resumes to delete. You have ${allResumes.length} resumes.`,
          data: {
            totalResumes: allResumes.length,
            deleted: 0
          }
        });
      }

      deleteQuery = { 
        userId,
        _id: { $in: idsToDelete }
      };
      
      console.log(`🗑️ Keeping ${keepCount} most recent, deleting ${idsToDelete.length} older resumes`);
    }
    // Default: Delete all resumes uploaded before November 1, 2025
    else {
      deleteQuery.createdAt = { $lt: new Date('2025-11-01') };
      console.log('📅 Deleting resumes before: 2025-11-01 (default)');
    }

    // Get resumes to delete (for file cleanup)
    const resumesToDelete = await Resume.find(deleteQuery);
    
    // Delete physical files for uploaded resumes
    for (const resume of resumesToDelete) {
      if (!resume.isBuiltResume && resume.fileName) {
        const filePath = path.join(__dirname, '../../uploads', resume.fileName);
        try {
          await fs.unlink(filePath);
          console.log('✅ File deleted:', resume.fileName);
        } catch (err) {
          console.log('⚠️ File not found or already deleted:', resume.fileName);
        }
      }
    }

    // Delete from database
    const result = await Resume.deleteMany(deleteQuery);

    console.log(`✅ Deleted ${result.deletedCount} resumes`);

    // Force stats refresh
    try {
      const user = await User.findById(userId);
      if (user) {
        user.stats.lastUpdated = new Date(0);
        await user.save();
        console.log('🔄 Stats cache cleared');
      }
    } catch (statsError) {
      console.error('⚠️ Stats refresh error:', statsError.message);
    }

    res.json({
      status: 'success',
      message: `Successfully deleted ${result.deletedCount} resumes`,
      data: {
        deleted: result.deletedCount,
        details: resumesToDelete.map(r => ({
          id: r._id,
          name: r.originalName || r.resumeName || r.fileName,
          date: r.createdAt,
          type: r.isBuiltResume ? 'built' : 'uploaded'
        }))
      }
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error cleaning up resumes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ====================================
// 🤖 AI OPTIMIZATION
// ====================================

// @desc    AI Optimize Resume
// @route   POST /api/resume/ai-optimize
// @access  Private
exports.aiOptimizeResume = async (req, res) => {
  try {
    const { resumeData } = req.body;
    
    // ✅ Safe user ID access with authentication check
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('🤖 AI Optimization requested for user:', userId);

    if (!resumeData) {
      return res.status(400).json({
        status: 'error',
        message: 'Resume data is required'
      });
    }

    // ✅ Initialize variables to prevent undefined errors
    let optimizedSummary = resumeData.personalInfo?.summary || '';
    let optimizedExperience = resumeData.experience || [];
    let optimizedProjects = resumeData.projects || [];
    let suggestedSkills = [];

    // Optimize Summary
    try {
      if (resumeData.personalInfo?.summary) {
        optimizedSummary = await enhanceSummary(resumeData.personalInfo.summary);
      }
    } catch (error) {
      console.error('❌ Error optimizing summary:', error.message);
    }

    // Optimize Experience
    try {
      if (resumeData.experience?.length > 0) {
        optimizedExperience = await Promise.all(
          resumeData.experience.map(async (exp) => {
            try {
              if (exp.description?.length > 0) {
                return {
                  ...exp,
                  description: await enhanceDescriptions(exp.description, exp.position)
                };
              }
              return exp;
            } catch (err) {
              console.error('❌ Error optimizing experience:', err.message);
              return exp;
            }
          })
        );
      }
    } catch (error) {
      console.error('❌ Error processing experience:', error.message);
    }

    // Optimize Projects
    try {
      if (resumeData.projects?.length > 0) {
        optimizedProjects = await Promise.all(
          resumeData.projects.map(async (project) => {
            try {
              return {
                ...project,
                description: project.description ? 
                  await enhanceProjectDescription(project.description) : 
                  project.description,
                highlights: project.highlights?.length > 0 ?
                  await enhanceDescriptions(project.highlights, 'Project') :
                  project.highlights
              };
            } catch (err) {
              console.error('❌ Error optimizing project:', err.message);
              return project;
            }
          })
        );
      }
    } catch (error) {
      console.error('❌ Error processing projects:', error.message);
    }

    // Suggest Skills
    try {
      suggestedSkills = await enhanceSkills(resumeData.skills || {});
    } catch (error) {
      console.error('❌ Error suggesting skills:', error.message);
      suggestedSkills = [];
    }

    // Build optimized resume
    const optimized = {
      ...resumeData,
      personalInfo: {
        ...resumeData.personalInfo,
        summary: optimizedSummary
      },
      experience: optimizedExperience,
      projects: optimizedProjects,
      skills: suggestedSkills
    };

    // Calculate ATS score
    const atsScore = calculateATSScore(optimized);

    console.log('✅ AI optimization complete. ATS Score:', atsScore);

    res.status(200).json({
      status: 'success',
      data: {
        optimizedData: optimized,
        atsScore: atsScore,
        improvements: [
          'Enhanced professional summary with industry keywords',
          'Improved bullet points with action verbs and metrics',
          'Optimized for ATS scanning',
          'Added relevant technical skills',
          'Professional grammar and tone'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Full optimization error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      status: 'error',
      message: 'AI Optimization Error: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ====================================
// 📄 PDF EXPORT
// ====================================

// @desc    Export resume as PDF
// @route   POST /api/resume/export-pdf
// @access  Private
exports.exportResumePDF = async (req, res) => {
  try {
    const { resumeData, template } = req.body;
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    console.log('📄 Exporting PDF for user:', userId);

    if (!resumeData) {
      return res.status(400).json({
        status: 'error',
        message: 'Resume data is required'
      });
    }

    const fullName = resumeData.personalInfo?.fullName || 'Resume';
    
    // Generate HTML
    const htmlContent = generateHTMLFromTemplate(resumeData, template || 'classic');

    // For now, just return the HTML (you can add Puppeteer later if needed)
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);

  } catch (error) {
    console.error('❌ Export PDF error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export PDF: ' + error.message
    });
  }
};

// @desc    Export resume as HTML
// @route   POST /api/resume/export-html
// @access  Private
exports.exportResumeHTML = async (req, res) => {
  try {
    const { resumeData, template } = req.body;
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const fullName = resumeData.personalInfo?.fullName || 'Resume';

    console.log('📄 Exporting HTML for user:', userId);
    console.log('📄 Full Name:', fullName);

    if (!resumeData) {
      return res.status(400).json({
        status: 'error',
        message: 'Resume data is required'
      });
    }

    // Generate complete HTML with embedded CSS
    const htmlContent = generateCompleteHTML(resumeData, template);

    // Send as download
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fullName.replace(/[^a-z0-9]/gi, '_')}_Resume.html"`);
    res.send(htmlContent);

    console.log('✅ HTML exported successfully');
  } catch (error) {
    console.error('❌ Export HTML error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export HTML: ' + error.message
    });
  }
};

// Helper function to generate complete HTML with all CSS embedded
function generateCompleteHTML(resumeData, template) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(resumeData.personalInfo?.fullName || 'Resume')}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.5;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }
    .resume-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      border-bottom: 3px solid #000;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .name {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 8px;
      text-align: center;
    }
    .contact-info {
      font-size: 12px;
      text-align: center;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 15px;
    }
    .contact-item {
      display: flex;
      align-items: center;
    }
    .divider {
      color: #ccc;
      margin: 0 5px;
    }
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 12px;
      letter-spacing: 1px;
    }
    .entry {
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      margin-bottom: 4px;
      flex-wrap: wrap;
      gap: 20px;
    }
    .entry-title {
      font-size: 12px;
      font-weight: 600;
    }
    .entry-date {
      font-size: 11px;
      color: #666;
      white-space: nowrap;
    }
    .entry-subtitle {
      font-size: 11px;
      font-style: italic;
      color: #555;
      margin-bottom: 6px;
    }
    .entry-description {
      font-size: 11px;
      line-height: 1.6;
      margin-left: 15px;
    }
    .entry-description ul {
      list-style-position: inside;
      padding-left: 10px;
    }
    .entry-description li {
      margin-bottom: 4px;
      text-align: justify;
    }
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
    .skill-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }
    .summary-text {
      font-size: 11px;
      line-height: 1.6;
      text-align: justify;
    }
    .label {
      font-weight: bold;
      display: inline;
    }
    .gpa {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .resume-container {
        box-shadow: none;
        padding: 20px;
        max-width: 100%;
      }
      .section {
        page-break-inside: avoid;
      }
      @page {
        size: letter;
        margin: 0.5in;
      }
    }
  </style>
</head>
<body>
  <div class="resume-container">
    <!-- HEADER -->
    <div class="header">
      <div class="name">${escapeHtml(resumeData.personalInfo?.fullName || 'Your Name')}</div>
      <div class="contact-info">
        ${resumeData.personalInfo?.email ? `<div class="contact-item">${escapeHtml(resumeData.personalInfo.email)}</div>` : ''}
        ${resumeData.personalInfo?.phone ? `<div class="contact-item"><span class="divider">|</span>${escapeHtml(resumeData.personalInfo.phone)}</div>` : ''}
        ${resumeData.personalInfo?.location ? `<div class="contact-item"><span class="divider">|</span>${escapeHtml(resumeData.personalInfo.location)}</div>` : ''}
        ${resumeData.personalInfo?.linkedin ? `<div class="contact-item"><span class="divider">|</span><a href="${escapeHtml(resumeData.personalInfo.linkedin)}" style="color: #667eea; text-decoration: none;">LinkedIn</a></div>` : ''}
        ${resumeData.personalInfo?.github ? `<div class="contact-item"><span class="divider">|</span><a href="${escapeHtml(resumeData.personalInfo.github)}" style="color: #667eea; text-decoration: none;">GitHub</a></div>` : ''}
      </div>
    </div>

    <!-- SUMMARY -->
    ${resumeData.personalInfo?.summary ? `
      <div class="section">
        <h2 class="section-title">Professional Summary</h2>
        <div class="summary-text">${escapeHtml(resumeData.personalInfo.summary)}</div>
      </div>
    ` : ''}

    <!-- EXPERIENCE -->
    ${resumeData.experience && resumeData.experience.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Work Experience</h2>
        ${resumeData.experience.map(exp => `
          <div class="entry">
            <div class="entry-header">
              <span class="entry-title">${escapeHtml(exp.position || '')}</span>
              <span class="entry-date">${formatDate(exp.startDate)} - ${exp.current ? 'Present' : formatDate(exp.endDate)}</span>
            </div>
            <div class="entry-subtitle">${escapeHtml(exp.company || '')}${exp.location ? ' | ' + escapeHtml(exp.location) : ''}</div>
            ${exp.description && exp.description.length > 0 ? `
              <div class="entry-description">
                <ul>
                  ${exp.description.map(desc => `<li>${escapeHtml(desc)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- EDUCATION -->
    ${resumeData.education && resumeData.education.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Education</h2>
        ${resumeData.education.map(edu => `
          <div class="entry">
            <div class="entry-header">
              <span class="entry-title">${escapeHtml(edu.degree || '')} in ${escapeHtml(edu.field || '')}</span>
              <span class="entry-date">${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}</span>
            </div>
            <div class="entry-subtitle">${escapeHtml(edu.institution || '')}</div>
            ${edu.location ? `<div class="gpa"><strong>Location:</strong> ${escapeHtml(edu.location)}</div>` : ''}
            ${edu.gpa ? `<div class="gpa"><strong>GPA:</strong> ${escapeHtml(edu.gpa)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- SKILLS -->
    ${resumeData.skills && Object.keys(resumeData.skills).some(key => resumeData.skills[key] && resumeData.skills[key].length > 0) ? `
      <div class="section">
        <h2 class="section-title">Skills</h2>
        <div class="skills-grid">
          ${(resumeData.skills.technical || []).map(skill => `<span class="skill-badge">${escapeHtml(skill)}</span>`).join('')}
          ${(resumeData.skills.tools || []).map(skill => `<span class="skill-badge">${escapeHtml(skill)}</span>`).join('')}
          ${(resumeData.skills.soft || []).map(skill => `<span class="skill-badge">${escapeHtml(skill)}</span>`).join('')}
          ${(resumeData.skills.languages || []).map(skill => `<span class="skill-badge">${escapeHtml(skill)}</span>`).join('')}
        </div>
      </div>
    ` : ''}

    <!-- PROJECTS -->
    ${resumeData.projects && resumeData.projects.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Projects</h2>
        ${resumeData.projects.map(proj => `
          <div class="entry">
            <div class="entry-header">
              <span class="entry-title">${escapeHtml(proj.name || '')}</span>
              ${proj.date ? `<span class="entry-date">${formatDate(proj.date)}</span>` : ''}
            </div>
            ${proj.description ? `<div class="entry-description">${escapeHtml(proj.description)}</div>` : ''}
            ${proj.technologies && proj.technologies.length > 0 ? `
              <div class="entry-description" style="margin-top: 4px;"><strong>Technologies:</strong> ${escapeHtml(proj.technologies.join(', '))}</div>
            ` : ''}
            ${proj.highlights && proj.highlights.length > 0 ? `
              <div class="entry-description">
                <ul>
                  ${proj.highlights.map(highlight => `<li>${escapeHtml(highlight)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- CERTIFICATIONS -->
    ${resumeData.certifications && resumeData.certifications.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Certifications</h2>
        ${resumeData.certifications.map(cert => `
          <div class="entry">
            <div class="entry-header">
              <span class="entry-title">${escapeHtml(cert.name || '')}</span>
              ${cert.date ? `<span class="entry-date">${formatDate(cert.date)}</span>` : ''}
            </div>
            ${cert.issuer ? `<div class="entry-subtitle">${escapeHtml(cert.issuer)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- POSITIONS OF RESPONSIBILITY -->
    ${resumeData.positionsOfResponsibility && resumeData.positionsOfResponsibility.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Positions of Responsibility</h2>
        ${resumeData.positionsOfResponsibility.map(pos => `
          <div class="entry">
            <div class="entry-header">
              <span class="entry-title">${escapeHtml(pos.title || '')}</span>
              <span class="entry-date">${formatDate(pos.startDate)} - ${pos.current ? 'Present' : formatDate(pos.endDate)}</span>
            </div>
            <div class="entry-subtitle">${escapeHtml(pos.organization || '')}</div>
            ${pos.description ? `<div class="entry-description">${escapeHtml(pos.description)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>

  <script>
    console.log('✅ Resume loaded successfully.');
    console.log('💡 Tip: Use Ctrl+P (Cmd+P on Mac) to print to PDF with better formatting.');
  </script>
</body>
</html>
  `;
}

// ====================================
// 🔧 HELPER FUNCTIONS
// ====================================

// Generate HTML from template
function generateHTMLFromTemplate(resumeData, template) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          line-height: 1.3;
          color: #333;
          font-size: 11pt;
        }
        .container {
          width: 8.5in;
          padding: 0.4in;
          margin: 0 auto;
          background: white;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .header {
          border-bottom: 2px solid #000;
          padding-bottom: 0.08in;
          margin-bottom: 0.12in;
          page-break-after: avoid;
        }
        .name {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 0.04in;
          text-align: center;
        }
        .contact {
          font-size: 9pt;
          text-align: center;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: normal;
        }
        .contact-divider {
          margin: 0 0.05in;
        }
        .section {
          margin-bottom: 0.12in;
          page-break-inside: avoid;
        }
        .section-title {
          font-weight: bold;
          font-size: 11pt;
          text-transform: uppercase;
          border-bottom: 1pt solid #000;
          padding-bottom: 0.02in;
          margin-bottom: 0.06in;
          letter-spacing: 0.5pt;
          page-break-after: avoid;
        }
        .entry {
          margin-bottom: 0.08in;
          page-break-inside: avoid;
        }
        .entry-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          margin-bottom: 0.01in;
          flex-wrap: wrap;
          gap: 0.1in;
        }
        .entry-header-left {
          flex: 1;
          min-width: 200px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .entry-header-right {
          white-space: nowrap;
          font-weight: normal;
          font-size: 10pt;
        }
        .entry-subheader {
          font-style: italic;
          font-size: 10pt;
          margin-bottom: 0.01in;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .entry-body {
          font-size: 10pt;
          margin-left: 0.1in;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        ul {
          margin-left: 0.15in;
          padding-left: 0.15in;
          list-style-position: outside;
        }
        li {
          margin-bottom: 0.02in;
          word-wrap: break-word;
          overflow-wrap: break-word;
          text-align: justify;
        }
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.08in;
        }
        .skill-tag {
          background: #f5f5f5;
          padding: 0.02in 0.06in;
          border-radius: 2px;
          font-size: 9.5pt;
          white-space: normal;
          word-wrap: break-word;
        }
        .summary-text {
          text-align: justify;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.4;
        }
        @media print {
          @page {
            size: letter;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- HEADER -->
        <div class="header">
          <div class="name">${escapeHtml(resumeData.personalInfo?.fullName || 'Your Name')}</div>
          <div class="contact">
            ${resumeData.personalInfo?.email ? `<span>${escapeHtml(resumeData.personalInfo.email)}</span>` : ''}
            ${resumeData.personalInfo?.phone ? `<span class="contact-divider">|</span><span>${escapeHtml(resumeData.personalInfo.phone)}</span>` : ''}
            ${resumeData.personalInfo?.location ? `<span class="contact-divider">|</span><span>${escapeHtml(resumeData.personalInfo.location)}</span>` : ''}
            ${resumeData.personalInfo?.linkedin ? `<span class="contact-divider">|</span><span>${escapeHtml(resumeData.personalInfo.linkedin)}</span>` : ''}
            ${resumeData.personalInfo?.github ? `<span class="contact-divider">|</span><span>${escapeHtml(resumeData.personalInfo.github)}</span>` : ''}
          </div>
        </div>

        <!-- SUMMARY -->
        ${resumeData.personalInfo?.summary ? `
          <div class="section">
            <div class="section-title">Professional Summary</div>
            <div class="summary-text">${escapeHtml(resumeData.personalInfo.summary)}</div>
          </div>
        ` : ''}

        <!-- EXPERIENCE -->
        ${resumeData.experience && resumeData.experience.length > 0 ? `
          <div class="section">
            <div class="section-title">Work Experience</div>
            ${resumeData.experience.map(exp => `
              <div class="entry">
                <div class="entry-header">
                  <div class="entry-header-left">${escapeHtml(exp.position || '')}</div>
                  <div class="entry-header-right">${formatDate(exp.startDate)} - ${exp.current ? 'Present' : formatDate(exp.endDate)}</div>
                </div>
                <div class="entry-subheader">${escapeHtml(exp.company || '')}${exp.location ? ' | ' + escapeHtml(exp.location) : ''}</div>
                ${exp.description && exp.description.length > 0 ? `
                  <ul class="entry-body">
                    ${exp.description.map(desc => `<li>${escapeHtml(desc)}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- EDUCATION -->
        ${resumeData.education && resumeData.education.length > 0 ? `
          <div class="section">
            <div class="section-title">Education</div>
            ${resumeData.education.map(edu => `
              <div class="entry">
                <div class="entry-header">
                  <div class="entry-header-left">${escapeHtml(edu.degree || '')} in ${escapeHtml(edu.field || '')}</div>
                  <div class="entry-header-right">${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}</div>
                </div>
                <div class="entry-subheader">${escapeHtml(edu.institution || '')}</div>
                ${edu.location ? `<div class="entry-body"><strong>Location:</strong> ${escapeHtml(edu.location)}</div>` : ''}
                ${edu.gpa ? `<div class="entry-body"><strong>GPA:</strong> ${escapeHtml(edu.gpa)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- SKILLS -->
        ${resumeData.skills && Object.keys(resumeData.skills).some(key => resumeData.skills[key] && resumeData.skills[key].length > 0) ? `
          <div class="section">
            <div class="section-title">Skills</div>
            <div class="skills-container">
              ${(resumeData.skills.technical || []).map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
              ${(resumeData.skills.tools || []).map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
              ${(resumeData.skills.soft || []).map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
              ${(resumeData.skills.languages || []).map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <!-- PROJECTS -->
        ${resumeData.projects && resumeData.projects.length > 0 ? `
          <div class="section">
            <div class="section-title">Projects</div>
            ${resumeData.projects.map(proj => `
              <div class="entry">
                <div class="entry-header">
                  <div class="entry-header-left">${escapeHtml(proj.name || '')}</div>
                  ${proj.date ? `<div class="entry-header-right">${formatDate(proj.date)}</div>` : ''}
                </div>
                ${proj.description ? `<div class="entry-body">${escapeHtml(proj.description)}</div>` : ''}
                ${proj.technologies && proj.technologies.length > 0 ? `
                  <div class="entry-body"><strong>Technologies:</strong> ${escapeHtml(proj.technologies.join(', '))}</div>
                ` : ''}
                ${proj.highlights && proj.highlights.length > 0 ? `
                  <ul class="entry-body">
                    ${proj.highlights.map(highlight => `<li>${escapeHtml(highlight)}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- CERTIFICATIONS -->
        ${resumeData.certifications && resumeData.certifications.length > 0 ? `
          <div class="section">
            <div class="section-title">Certifications</div>
            ${resumeData.certifications.map(cert => `
              <div class="entry">
                <div class="entry-header">
                  <div class="entry-header-left">${escapeHtml(cert.name || '')}</div>
                  ${cert.date ? `<div class="entry-header-right">${formatDate(cert.date)}</div>` : ''}
                </div>
                ${cert.issuer ? `<div class="entry-subheader">${escapeHtml(cert.issuer)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- POSITIONS OF RESPONSIBILITY -->
        ${resumeData.positionsOfResponsibility && resumeData.positionsOfResponsibility.length > 0 ? `
          <div class="section">
            <div class="section-title">Positions of Responsibility</div>
            ${resumeData.positionsOfResponsibility.map(pos => `
              <div class="entry">
                <div class="entry-header">
                  <div class="entry-header-left">${escapeHtml(pos.title || '')}</div>
                  <div class="entry-header-right">${formatDate(pos.startDate)} - ${pos.current ? 'Present' : formatDate(pos.endDate)}</div>
                </div>
                <div class="entry-subheader">${escapeHtml(pos.organization || '')}</div>
                ${pos.description ? `<div class="entry-body">${escapeHtml(pos.description)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// AI Optimization Helper Functions
async function optimizeResumeContent(resumeData) {
  const optimized = JSON.parse(JSON.stringify(resumeData));

  // 1. Optimize Professional Summary
  if (optimized.personalInfo?.summary) {
    optimized.personalInfo.summary = await enhanceSummary(optimized.personalInfo.summary);
  }

  // 2. Optimize Experience Descriptions
  if (optimized.experience && optimized.experience.length > 0) {
    for (let i = 0; i < optimized.experience.length; i++) {
      const exp = optimized.experience[i];
      if (exp.description && exp.description.length > 0) {
        exp.description = await enhanceDescriptions(exp.description, exp.position);
      }
    }
  }

  // 3. Enhance Skills
  if (optimized.skills) {
    optimized.skills = await enhanceSkills(optimized.skills);
  }

  // 4. Optimize Project Descriptions
  if (optimized.projects && optimized.projects.length > 0) {
    for (let i = 0; i < optimized.projects.length; i++) {
      const project = optimized.projects[i];
      if (project.description) {
        project.description = await enhanceProjectDescription(project.description);
      }
      if (project.highlights && project.highlights.length > 0) {
        project.highlights = await enhanceDescriptions(project.highlights, 'Project');
      }
    }
  }

  return optimized;
}

async function enhanceSummary(summary) {
  if (!summary || summary.length < 20) {
    return "Results-driven professional with proven expertise in delivering high-impact solutions. Skilled in leveraging technology and strategic thinking to drive business success and exceed organizational goals.";
  }

  const powerWords = ['proven', 'demonstrated', 'accomplished', 'expert', 'strategic'];
  
  let enhanced = summary;
  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  
  if (!enhanced.endsWith('.')) {
    enhanced += '.';
  }

  const lowerSummary = enhanced.toLowerCase();
  if (!powerWords.some(word => lowerSummary.includes(word))) {
    enhanced = 'Proven ' + enhanced.charAt(0).toLowerCase() + enhanced.slice(1);
  }

  return enhanced;
}

async function enhanceDescriptions(descriptions, role) {
  const actionVerbs = [
    'Developed', 'Implemented', 'Led', 'Managed', 'Designed', 'Created',
    'Optimized', 'Improved', 'Streamlined', 'Architected', 'Collaborated',
    'Spearheaded', 'Executed', 'Delivered', 'Achieved', 'Established'
  ];

  const metrics = ['by 30%', 'resulting in 25% increase', 'improving efficiency by 40%', 
                   'reducing costs by $50K', 'serving 10,000+ users'];

  return descriptions.map(desc => {
    if (!desc || desc.length < 10) return desc;

    let enhanced = desc.trim();
    
    const startsWithActionVerb = actionVerbs.some(verb => 
      enhanced.toLowerCase().startsWith(verb.toLowerCase())
    );
    
    if (!startsWithActionVerb && !enhanced.startsWith('•')) {
      const randomVerb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
      enhanced = randomVerb + ' ' + enhanced.charAt(0).toLowerCase() + enhanced.slice(1);
    }

    enhanced = enhanced.replace(/^[•\-\*]\s*/, '');
    enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);

    const hasMetric = /\d+%|\d+\+|\$\d+/.test(enhanced);
    if (!hasMetric && enhanced.length < 100) {
      const randomMetric = metrics[Math.floor(Math.random() * metrics.length)];
      if (!enhanced.endsWith('.')) {
        enhanced += ', ' + randomMetric;
      } else {
        enhanced = enhanced.slice(0, -1) + ', ' + randomMetric + '.';
      }
    }

    if (!enhanced.endsWith('.') && !enhanced.endsWith(',')) {
      enhanced += '.';
    }

    return enhanced;
  });
}

async function enhanceSkills(skills) {
  const enhanced = { ...skills };

  const commonTechnical = ['Agile', 'Git', 'RESTful APIs', 'Database Design', 'Problem Solving'];
  const commonSoft = ['Leadership', 'Communication', 'Team Collaboration', 'Critical Thinking'];

  if (enhanced.technical && enhanced.technical.length < 10) {
    const missing = commonTechnical.filter(s => 
      !enhanced.technical.some(existing => 
        existing.toLowerCase().includes(s.toLowerCase())
      )
    );
    enhanced.technical = [...enhanced.technical, ...missing.slice(0, 3)];
  }

  if (enhanced.soft && enhanced.soft.length < 5) {
    const missing = commonSoft.filter(s => 
      !enhanced.soft.some(existing => 
        existing.toLowerCase().includes(s.toLowerCase())
      )
    );
    enhanced.soft = [...enhanced.soft, ...missing.slice(0, 2)];
  }

  return enhanced;
}

async function enhanceProjectDescription(description) {
  if (!description || description.length < 20) {
    return "Developed a comprehensive solution addressing key business challenges, implementing modern technologies and best practices to deliver measurable results.";
  }

  let enhanced = description.trim();
  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  
  if (!enhanced.endsWith('.')) {
    enhanced += '.';
  }

  if (enhanced.length < 100 && !enhanced.includes('utilizing') && !enhanced.includes('implementing')) {
    enhanced = enhanced.slice(0, -1) + ', implementing industry best practices and modern development methodologies.';
  }

  return enhanced;
}

// Calculate ATS Score
function calculateATSScore(resumeData) {
  let score = 0;
  let maxScore = 100;

  // Contact Info (20 points)
  if (resumeData.personalInfo?.email) score += 7;
  if (resumeData.personalInfo?.phone) score += 7;
  if (resumeData.personalInfo?.location) score += 6;

  // Summary (15 points)
  if (resumeData.personalInfo?.summary && resumeData.personalInfo.summary.length > 100) {
    score += 15;
  } else if (resumeData.personalInfo?.summary && resumeData.personalInfo.summary.length > 50) {
    score += 10;
  } else if (resumeData.personalInfo?.summary) {
    score += 5;
  }

  // Experience (25 points)
  if (resumeData.experience && resumeData.experience.length > 0) {
    const validExperience = resumeData.experience.filter(e => e.company && e.position);
    if (validExperience.length >= 3) score += 25;
    else if (validExperience.length === 2) score += 20;
    else if (validExperience.length === 1) score += 15;
    
    // Bonus for descriptions
    const withDescriptions = validExperience.filter(e => 
      e.description && e.description.length >= 3
    );
    if (withDescriptions.length > 0) score += 5;
  }

  // Skills (20 points)
  const totalSkills = [
    ...(resumeData.skills?.technical || []),
    ...(resumeData.skills?.tools || [])
  ].length;
  if (totalSkills >= 12) score += 20;
  else if (totalSkills >= 10) score += 17;
  else if (totalSkills >= 7) score += 15;
  else if (totalSkills >= 5) score += 10;

  // Education (10 points)
  if (resumeData.education && resumeData.education.length > 0) {
    const validEducation = resumeData.education.filter(e => e.institution && e.degree);
    if (validEducation.length > 0) score += 10;
  }

  // Projects (10 points)
  if (resumeData.projects && resumeData.projects.length > 0) {
    const validProjects = resumeData.projects.filter(p => p.name && p.description);
    if (validProjects.length >= 2) score += 10;
    else if (validProjects.length === 1) score += 5;
  }

  return Math.min(Math.round((score / maxScore) * 100), 95);
}

// ===== EXPORTS - PUT THIS AT THE VERY END =====
// Note: All exports are already defined as exports.functionName above
// This module.exports just re-exports them for cleaner imports
