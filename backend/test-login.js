const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const getMongoUri = require('./src/config/getMongoUri');

// Connect to MongoDB
const mongoUri = getMongoUri();
mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const User = require('./src/models/User');

async function testLogin() {
  try {
    const email = 'param.shah23@spit.ac.in';
    const password = 'Param@123'; // Replace with the actual password you're trying
    
    console.log('\n🔍 Searching for user:', email);
    console.log('🔑 Testing with password:', password);
    
    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('❌ User not found in database');
      console.log('\n📊 All users in database:');
      const allUsers = await User.find({}).select('email name isEmailVerified');
      console.log(allUsers);
      
      // Let's create the user if it doesn't exist
      console.log('\n🆕 Creating user account...');
      const newUser = await User.create({
        name: 'Param Shah',
        email: email.toLowerCase(),
        password: password,
        role: 'student'
      });
      console.log('✅ User created:', newUser.email);
      console.log('🔑 You can now login with:', email, '/', password);
      process.exit(0);
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('📧 Email verified:', user.isEmailVerified);
    console.log('🔐 Password hash exists:', !!user.password);
    console.log('🔐 Password hash:', user.password.substring(0, 20) + '...');
    
    // Test password comparison
    console.log('\n🔐 Testing password comparison...');
    const isMatch = await user.comparePassword(password);
    console.log('Result:', isMatch ? '✅ Password MATCHES' : '❌ Password DOES NOT MATCH');
    
    if (!isMatch) {
      console.log('\n⚠️  Password mismatch detected!');
      console.log('💡 Forcefully updating password to:', password);
      
      // Force update by directly setting and saving
      user.password = password;
      user.isModified('password'); // Mark as modified
      await user.save({ validateBeforeSave: false });
      
      console.log('✅ Password forcefully updated');
      
      // Verify the update worked
      const updatedUser = await User.findOne({ email: email.toLowerCase() }).select('+password');
      const verifyMatch = await updatedUser.comparePassword(password);
      console.log('🔐 Verification after update:', verifyMatch ? '✅ SUCCESS' : '❌ STILL FAILED');
      console.log('🔑 You can now login with:', email, '/', password);
    } else {
      console.log('\n✅ Login should work with current password');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLogin();
