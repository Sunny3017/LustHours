const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'moderator'],
        default: 'admin'
    },
    permissions: {
        users: {
            view: { type: Boolean, default: true },
            create: { type: Boolean, default: true },
            edit: { type: Boolean, default: true },
            delete: { type: Boolean, default: false }
        },
        products: {
            view: { type: Boolean, default: true },
            create: { type: Boolean, default: true },
            edit: { type: Boolean, default: true },
            delete: { type: Boolean, default: true }
        },
        orders: {
            view: { type: Boolean, default: true },
            update: { type: Boolean, default: true }
        },
        analytics: {
            view: { type: Boolean, default: true }
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,
    profileImage: {
        type: String,
        default: 'default-admin.jpg'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Encrypt password before saving
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update passwordChangedAt when password is modified
adminSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
adminSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        { 
            id: this._id, 
            email: this.email,
            role: this.role,
            permissions: this.permissions
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
};

// Generate refresh token
adminSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        { id: this._id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
};

// Generate password reset token
adminSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
};

// Check if password was changed after token was issued
adminSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Generate 2FA secret (for future implementation)
adminSchema.methods.generateTwoFactorSecret = function() {
    this.twoFactorSecret = crypto.randomBytes(20).toString('hex');
    return this.twoFactorSecret;
};

// Virtual for full profile URL
adminSchema.virtual('profileImageUrl').get(function() {
    if (this.profileImage) {
        return `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/admins/${this.profileImage}`;
    }
    return `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/default-admin.jpg`;
});

// Virtual for admin activity status
adminSchema.virtual('isOnline').get(function() {
    if (!this.lastLogin) return false;
    const now = new Date();
    const lastLoginTime = new Date(this.lastLogin);
    const diffInMinutes = (now - lastLoginTime) / (1000 * 60);
    return diffInMinutes < 15; // Consider online if logged in within last 15 minutes
});

// Indexes for better performance
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ createdAt: -1 });

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;