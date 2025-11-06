const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  location: {
    type: String,
    default: '',
    trim: true
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  role: {
    type: String,
    enum: ['student', 'professional', 'admin'],
    default: 'student'
  },
  currentRole: {
    type: String,
    default: '',
    trim: true
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  skills: [{
    type: String,
    trim: true
  }],
  targetRoles: [{
    role: {
      type: String,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  coursesCompleted: {
    type: Number,
    default: 0
  },
  profilePicture: {
    type: String,
    default: ''
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  // ✅ NEW: Dashboard stats cached in user profile
  stats: {
    resumesAnalyzed: {
      type: Number,
      default: 0
    },
    resumesThisWeek: {
      type: Number,
      default: 0
    },
    averageMatchScore: {
      type: Number,
      default: 0
    },
    scoreImprovement: {
      type: Number,
      default: 0
    },
    targetRoles: {
      type: Number,
      default: 0
    },
    activeTargetRoles: {
      type: Number,
      default: 0
    },
    coursesRecommended: {
      type: Number,
      default: 0
    },
    coursesCompleted: {
      type: Number,
      default: 0
    },
    totalBuiltResumes: {
      type: Number,
      default: 0
    },
    totalUploadedResumes: {
      type: Number,
      default: 0
    },
    skillsIdentified: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ===== INDEXES =====
// Note: email index is already created by 'unique: true' in schema definition
userSchema.index({ 'stats.lastUpdated': 1 });

// ===== PRE-SAVE MIDDLEWARE: Hash Password =====
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed for user:', this.email);
    next();
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    next(error);
  }
});

// ===== INSTANCE METHOD: Compare Password =====
userSchema.methods.comparePassword = async function(enteredPassword) {
  try {
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    console.log('🔐 Password comparison result:', isMatch ? 'Match' : 'No match');
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

// ===== INSTANCE METHOD: Generate Auth Token =====
userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { 
      userId: this._id,
      id: this._id, // Include both for compatibility
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET || 'your-secret-key-here',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
  
  console.log('🎫 Token generated for user:', this.email);
  return token;
};

// ===== INSTANCE METHOD: Update Last Login =====
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = Date.now();
  await this.save();
};

// ✅ NEW: Update stats method (for dashboard caching)
userSchema.methods.updateStats = async function(statsData) {
  try {
    this.stats = {
      ...this.stats.toObject(),
      ...statsData,
      lastUpdated: Date.now()
    };
    
    await this.save();
    console.log('✅ Stats updated for user:', this.email);
    return this.stats;
  } catch (error) {
    console.error('❌ Stats update error:', error);
    throw error;
  }
};

// ✅ NEW: Check if stats need refresh (older than 5 minutes for more accurate data)
userSchema.methods.needsStatsRefresh = function() {
  if (!this.stats || !this.stats.lastUpdated) {
    return true;
  }
  
  const fiveMinutes = 5 * 60 * 1000; // Changed from 1 hour to 5 minutes
  const timeSinceUpdate = Date.now() - new Date(this.stats.lastUpdated).getTime();
  
  return timeSinceUpdate > fiveMinutes;
};

// ===== STATIC METHOD: Find by Email =====
userSchema.statics.findByEmail = async function(email) {
  return await this.findOne({ email: email.toLowerCase() });
};

// ===== VIRTUAL: Full Name =====
userSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});

// ===== toJSON Override: Remove sensitive data =====
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// ===== PRE-REMOVE MIDDLEWARE: Cleanup =====
userSchema.pre('remove', async function(next) {
  try {
    // Delete all user's resumes when user is deleted
    const Resume = mongoose.model('Resume');
    await Resume.deleteMany({ userId: this._id });
    console.log('✅ User data cleanup completed for:', this.email);
    next();
  } catch (error) {
    console.error('❌ User cleanup error:', error);
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);
