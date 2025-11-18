// Script to actually DELETE old resume duplicates
require('dotenv').config();
const mongoose = require('mongoose');
const Resume = require('./src/models/Resume');
const User = require('./src/models/User');
const getMongoUri = require('./src/config/getMongoUri');

async function deleteOldResumes() {
  try {
    const mongoUri = getMongoUri();
    await mongoose.connect(mongoUri);
    console.log('📊 Connected to MongoDB');

    const user = await User.findOne({ email: 'param.shah.0090@gmail.com' });
    
    // Get all resumes
    const allResumes = await Resume.find({ 
      userId: user._id 
    }).sort({ createdAt: -1, uploadedAt: -1 });
    
    console.log(`\n📋 Found ${allResumes.length} total resumes`);
    
    // Keep only the last 3 (most recent)
    const toKeep = allResumes.slice(0, 3);
    const toDelete = allResumes.slice(3);
    
    console.log(`\n✅ KEEPING (${toKeep.length}):`);
    toKeep.forEach((r, i) => {
      const date = r.uploadedAt || r.createdAt;
      console.log(`${i+1}. ${r.originalName || r.resumeName} - ${new Date(date).toLocaleString()} - ID: ${r._id}`);
    });
    
    console.log(`\n🗑️  DELETING (${toDelete.length}):`);
    toDelete.forEach((r, i) => {
      const date = r.uploadedAt || r.createdAt;
      console.log(`${i+1}. ${r.originalName || r.resumeName} - ${new Date(date).toLocaleString()} - ID: ${r._id}`);
    });
    
    // Delete them permanently
    if (toDelete.length > 0) {
      const deleteIds = toDelete.map(r => r._id);
      const result = await Resume.deleteMany({ _id: { $in: deleteIds } });
      console.log(`\n✅ Deleted ${result.deletedCount} resumes from database`);
      
      // Clear stats cache
      user.stats = undefined;
      await user.save();
      console.log('✅ Cleared user stats cache');
    } else {
      console.log('\n⚠️  No resumes to delete!');
    }
    
    // Verify
    const remaining = await Resume.find({ userId: user._id });
    console.log(`\n📊 Remaining resumes in DB: ${remaining.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteOldResumes();
