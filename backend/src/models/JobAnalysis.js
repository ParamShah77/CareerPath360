const mongoose = require('mongoose');

const jobAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    jobUrl: {
      type: String,
      required: true
    },
    jobTitle: {
      type: String,
      required: true
    },
    companyName: {
      type: String,
      default: null
    },
    jobDescription: {
      type: String,
      required: true
    },
    requiredSkills: {
      type: [String],
      default: []
    },
    preferredSkills: {
      type: [String],
      default: []
    },
    experience: {
      type: String,
      default: null
    },
    jobBoard: {
      type: String,
      default: null
    },
    scrapeStrategy: {
      type: String,
      default: 'axios'
    },
    location: {
      type: String,
      default: null
    },
    salary: {
      type: String,
      default: null
    },
    // Analysis Results
    matchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    matchGrade: {
      type: String,
      default: 'Not Evaluated'
    },
    matchBreakdown: {
      requiredSkills: { type: Number, default: 0 },
      preferredSkills: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
      skillDepth: { type: Number, default: 0 },
      industryRelevance: { type: Number, default: 0 }
    },
    matchInsights: {
      type: [String],
      default: []
    },
    userSkills: {
      type: [String],
      default: []
    },
    matchingSkills: {
      type: [String],
      default: []
    },
    missingSkills: {
      type: [String],
      default: []
    },
    recommendations: {
      type: [String],
      default: []
    },
    recommendedCourses: {
      type: [{
        title: String,
        platform: String,
        url: String,
        relevance: String
      }],
      default: []
    },
    strengths: {
      type: [String],
      default: []
    },
    areasToImprove: {
      type: [String],
      default: []
    },
    aiAnalysis: {
      type: String,
      default: null
    },
    atsScoreSnapshot: {
      type: Number,
      default: null
    },
    atsScoreSource: {
      type: String,
      default: null
    },
    resumeUsed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'job_analyses'
  }
);

// Add indexing for better query performance
jobAnalysisSchema.index({ userId: 1, createdAt: -1 });
jobAnalysisSchema.index({ matchScore: -1 });

const JobAnalysis = mongoose.model('JobAnalysis', jobAnalysisSchema);

module.exports = JobAnalysis;
