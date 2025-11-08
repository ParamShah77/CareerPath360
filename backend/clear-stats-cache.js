// Quick script to clear dashboard stats cache
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function clearStatsCache() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📊 Connected to MongoDB');

    // Find user and check stats
    const user = await User.findOne({ email: 'param.shah.0090@gmail.com' }).lean();
    console.log('\n=== CURRENT USER DATA ===');
    console.log('Email:', user.email);
    console.log('Stats:', JSON.stringify(user.stats, null, 2));
    
    // Get actual resume count
    const Resume = require('./src/models/Resume');
    const allResumes = await Resume.find({ 
      userId: user._id
    }).lean();
    
    const activeResumes = allResumes.filter(r => r.deleted !== true);
    const deletedResumes = allResumes.filter(r => r.deleted === true);
    
    console.log('\n=== ACTUAL RESUME DATA ===');
    console.log('Total resumes in DB:', allResumes.length);
    console.log('Active (not deleted):', activeResumes.length);
    console.log('Deleted:', deletedResumes.length);
    
    console.log('\n=== ACTIVE RESUMES ===');
    activeResumes.forEach((r, i) => {
      console.log(`${i+1}. ${r.originalName || r.resumeName} - Uploaded: ${new Date(r.uploadedAt || r.createdAt).toLocaleString()} - ATS: ${r.atsScore || r.parsedData?.final_ats_score || 'N/A'}`);
    });
    
    // Calculate actual average
    const scores = activeResumes.map(r => r.atsScore || r.parsedData?.final_ats_score || 0).filter(s => s > 0);
    const avgScore = scores.length > 0 ? scores.reduce((a,b) => a+b) / scores.length : 0;
    console.log('\n=== CALCULATED STATS ===');
    console.log('Actual count:', activeResumes.length);
    console.log('Actual average ATS:', avgScore.toFixed(1) + '%');
    
    console.log('\n=== WHAT DASHBOARD SHOULD SHOW ===');
    console.log(`Resumes Analyzed: ${activeResumes.length}`);
    console.log(`Average ATS Score: ${avgScore.toFixed(1)}%`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearStatsCache();
