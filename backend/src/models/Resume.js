const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    resumeData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    template: {
      type: String,
      enum: [
        'classic',
        'minimal-jake',
        'techy-modern',
        'student-fresher',
        'project-based',
        'data-science',
        'developer',
        'business-analyst',
        'designer',
        'senior-professional',
        'marketing',
        'hr',
        'sales',
        'teaching',
        'finance',
        'operations',
        'healthcare',
        'professional' // Legacy compatibility
      ],
      default: 'classic'
    },
    atsScore: {
      type: Number,
      default: 0
    },
    fileName: {
      type: String,
      default: null
    },
    fileType: {
      type: String,
      default: null
    },
    originalName: {
      type: String,
      default: null
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    deleted: {
      type: Boolean,
      default: false
    },
    isBuiltResume: {
      type: Boolean,
      default: false
    },
    parseStatus: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing'
    },
    parsedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    aiOptimized: {
      type: Boolean,
      default: false
    },
    builtResumeData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    resumeName: {
      type: String,
      default: null
    },
    selectedTemplate: {
      type: String,
      enum: [
        'classic',
        'minimal-jake',
        'techy-modern',
        'student-fresher',
        'project-based',
        'data-science',
        'developer',
        'business-analyst',
        'designer',
        'senior-professional',
        'marketing',
        'hr',
        'sales',
        'teaching',
        'finance',
        'operations',
        'healthcare',
        'professional' // Legacy compatibility
      ],
      default: 'classic'
    }
  },
  {
    timestamps: true,
    collection: 'resumes'
  }
);

// Add indexing for better query performance
resumeSchema.index({ userId: 1, createdAt: -1 });

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
