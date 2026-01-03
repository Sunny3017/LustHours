const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  profilePicture: {
    type: String,
    default: 'https://res.cloudinary.com/dutubf5nc/image/upload/v1700000000/adult-platform/default-avatar.png' // Consider changing this default URL
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscribedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  subscribers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  watchHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  likedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  addresses: [addressSchema],
  phoneNumber: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ subscribedTo: 1 });
userSchema.index({ likedVideos: 1 });
userSchema.index({ watchHistory: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Remove duplicates from arrays before saving
userSchema.pre('save', function(next) {
  // Remove duplicate ObjectIds from arrays using Set
  if (this.isModified('likedVideos') && Array.isArray(this.likedVideos)) {
    const seen = new Set();
    this.likedVideos = this.likedVideos.filter(id => {
      const idStr = id.toString();
      if (seen.has(idStr)) return false;
      seen.add(idStr);
      return true;
    });
  }
  if (this.isModified('subscribedTo') && Array.isArray(this.subscribedTo)) {
    const seen = new Set();
    this.subscribedTo = this.subscribedTo.filter(id => {
      const idStr = id.toString();
      if (seen.has(idStr)) return false;
      seen.add(idStr);
      return true;
    });
  }
  if (this.isModified('watchHistory') && Array.isArray(this.watchHistory)) {
    const seen = new Set();
    this.watchHistory = this.watchHistory.filter(id => {
      const idStr = id.toString();
      if (seen.has(idStr)) return false;
      seen.add(idStr);
      return true;
    });
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate verification token
userSchema.methods.generateVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return resetToken;
};

// Generate Auth Token
userSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

module.exports = mongoose.model('User', userSchema);
