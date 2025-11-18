const mongoose = require('mongoose');
const getMongoUri = require('./getMongoUri');

const connectDB = async () => {
  try {
    const mongoUri = getMongoUri();
    const conn = await mongoose.connect(mongoUri, {
      // These options are no longer needed in Mongoose 6+
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database Name: ${conn.connection.name}`);
    
    // Connection events
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔴 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('💡 Make sure:');
    console.error('   1. MongoDB is running');
    console.error('   2. MONGO_URI or MONGODB_URI is correct in .env file');
    console.error('   3. Network/firewall is not blocking connection');
    process.exit(1);
  }
};

module.exports = connectDB;