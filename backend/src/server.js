const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// ===== MIDDLEWARE =====
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== IMPORT ROUTES =====
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const dashboardRoutes = require('./routes/dashboard');
const profileRoutes = require('./routes/profile');
const analysisRoutes = require('./routes/analysis');
const jobRoleRoutes = require('./routes/jobRole');
const courseRoutes = require('./routes/course');
const chatbotRoutes = require('./routes/chatbot');
const builderRoutes = require('./routes/builder');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notification');

// ===== REGISTER ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/job-roles', jobRoleRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/builder', builderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

// ===== ROOT ENDPOINT =====
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to CareerPath360 API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      resume: '/api/resume',
      dashboard: '/api/dashboard',
      profile: '/api/profile',
      analysis: '/api/analysis',
      jobRoles: '/api/job-roles',
      courses: '/api/courses',
      chatbot: '/api/chatbot',
      builder: '/api/builder',
      ai: '/api/ai',
      notifications: '/api/notifications'
    }
  });
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'CareerPath360 Backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  if (err.name === 'MulterError') {
    return res.status(400).json({
      status: 'error',
      message: 'File upload error: ' + err.message
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate field value'
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired'
    });
  }
  
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CareerPath360 Backend Server');
  console.log('='.repeat(60));
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`🔗 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log('\n📋 Available Routes:');
  console.log('   ✅ Health:     GET  /api/health');
  console.log('   🔐 Auth:       POST /api/auth/register, /login');
  console.log('   📄 Resume:     GET  /api/resume');
  console.log('   📊 Dashboard:  GET  /api/dashboard/stats');
  console.log('   👤 Profile:    GET  /api/profile');
  console.log('   🔍 Analysis:   POST /api/analysis');
  console.log('   💼 Jobs:       GET  /api/job-roles');
  console.log('   📚 Courses:    GET  /api/courses');
  console.log('   💬 Chatbot:    POST /api/chatbot');
  console.log('   🔨 Builder:    POST /api/builder');
  console.log('   🤖 AI:         POST /api/ai/optimize');
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
