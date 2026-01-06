const Admin = require('../models/Admin');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc    Register admin
// @route   POST /api/v1/auth/admin/register
// @access  Private (Superadmin only)
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
        return next(new ErrorResponse('Admin already exists with this email', 400));
    }
    
    // Create admin
    const admin = await Admin.create({
        name,
        email,
        password,
        role: req.admin.role === 'superadmin' ? (role || 'admin') : 'admin'
    });
    
    // Create token
    const token = admin.generateAuthToken();
    
    res.status(201).json({
        success: true,
        data: {
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            },
            token
        }
    });
});

// @desc    Login admin
// @route   POST /api/v1/auth/admin/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    
    // Validate email & password
    if (!email || !password) {
        return next(new ErrorResponse('Please provide email and password', 400));
    }
    
    // Check for admin
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }
    
    // Check if admin is active
    if (!admin.isActive) {
        return next(new ErrorResponse('Your account has been deactivated', 401));
    }
    
    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }
    
    // Update last login
    admin.lastLogin = Date.now();
    await admin.save();
    
    // Create token
    const token = admin.generateAuthToken();
    const refreshToken = admin.generateRefreshToken();
    
    // Remove password from output
    admin.password = undefined;
    
    res.status(200).json({
        success: true,
        data: {
            admin,
            token,
            refreshToken
        }
    });
});

// @desc    Get current logged in admin
// @route   GET /api/v1/auth/admin/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    const admin = await Admin.findById(req.admin.id);
    
    res.status(200).json({
        success: true,
        data: admin
    });
});

// @desc    Update admin details
// @route   PUT /api/v1/auth/admin/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email
    };
    
    const admin = await Admin.findByIdAndUpdate(req.admin.id, fieldsToUpdate, {
        new: true,
        runValidators: true
    });
    
    res.status(200).json({
        success: true,
        data: admin
    });
});

// @desc    Update password
// @route   PUT /api/v1/auth/admin/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const admin = await Admin.findById(req.admin.id).select('+password');
    
    // Check current password
    const isMatch = await admin.comparePassword(req.body.currentPassword);
    if (!isMatch) {
        return next(new ErrorResponse('Password is incorrect', 401));
    }
    
    admin.password = req.body.newPassword;
    await admin.save();
    
    // Create new token
    const token = admin.generateAuthToken();
    
    res.status(200).json({
        success: true,
        data: {
            token
        }
    });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/admin/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const admin = await Admin.findOne({ email: req.body.email });
    
    if (!admin) {
        return next(new ErrorResponse('There is no admin with that email', 404));
    }
    
    // Get reset token
    const resetToken = admin.createPasswordResetToken();
    await admin.save({ validateBeforeSave: false });
    
    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/admin/resetpassword/${resetToken}`;
    
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;
    
    try {
        await sendEmail({
            email: admin.email,
            subject: 'Password reset token',
            message
        });
        
        res.status(200).json({ 
            success: true, 
            data: 'Email sent' 
        });
    } catch (err) {
        const meta = { code: err.meta?.code || err.code, response: err.meta?.response || err.response, message: err.meta?.message || err.message };
        console.log(JSON.stringify({ op: 'admin.forgotPassword', error: meta }));
        admin.passwordResetToken = undefined;
        admin.passwordResetExpires = undefined;
        await admin.save({ validateBeforeSave: false });
        
        return next(new ErrorResponse('EMAIL_SEND_FAILED', 500));
    }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/admin/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');
    
    const admin = await Admin.findOne({
        passwordResetToken: resetPasswordToken,
        passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!admin) {
        return next(new ErrorResponse('Invalid token', 400));
    }
    
    // Set new password
    admin.password = req.body.password;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();
    
    // Create token
    const token = admin.generateAuthToken();
    
    res.status(200).json({
        success: true,
        data: {
            token
        }
    });
});

// @desc    Logout admin
// @route   GET /api/v1/auth/admin/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
    // For JWT, we handle logout on client side by removing token
    // For enhanced security, you might want to implement a token blacklist
    
    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Get all admins
// @route   GET /api/v1/admin/admins
// @access  Private (Superadmin only)
exports.getAdmins = asyncHandler(async (req, res, next) => {
    const admins = await Admin.find();
    
    res.status(200).json({
        success: true,
        count: admins.length,
        data: admins
    });
});

// @desc    Get single admin
// @route   GET /api/v1/admin/admins/:id
// @access  Private (Superadmin only)
exports.getAdmin = asyncHandler(async (req, res, next) => {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
        return next(new ErrorResponse(`Admin not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
        success: true,
        data: admin
    });
});

// @desc    Update admin
// @route   PUT /api/v1/admin/admins/:id
// @access  Private (Superadmin only)
exports.updateAdmin = asyncHandler(async (req, res, next) => {
    // Exclude password from update
    const { password, ...updateData } = req.body;
    
    const admin = await Admin.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
    });
    
    if (!admin) {
        return next(new ErrorResponse(`Admin not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
        success: true,
        data: admin
    });
});

// @desc    Delete admin
// @route   DELETE /api/v1/admin/admins/:id
// @access  Private (Superadmin only)
exports.deleteAdmin = asyncHandler(async (req, res, next) => {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
        return next(new ErrorResponse(`Admin not found with id of ${req.params.id}`, 404));
    }
    
    // Prevent deleting self
    if (admin._id.toString() === req.admin.id) {
        return next(new ErrorResponse('You cannot delete your own account', 400));
    }
    
    await admin.deleteOne();
    
    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Deactivate/Activate admin
// @route   PUT /api/v1/admin/admins/:id/toggle-status
// @access  Private (Superadmin only)
exports.toggleAdminStatus = asyncHandler(async (req, res, next) => {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
        return next(new ErrorResponse(`Admin not found with id of ${req.params.id}`, 404));
    }
    
    admin.isActive = !admin.isActive;
    await admin.save();
    
    res.status(200).json({
        success: true,
        data: admin
    });
});

// @desc    Send bulk email to all users
// @route   POST /api/v1/admin/send-bulk-email
// @access  Private (Admin only)
exports.sendBulkEmail = asyncHandler(async (req, res, next) => {
    const { subject, message, html } = req.body;
    
    if (!subject || !message) {
        return next(new ErrorResponse('Please provide subject and message', 400));
    }
    
    // Get all active users
    const User = require('../models/User');
    const users = await User.find({ isActive: true }).select('email');
    
    if (users.length === 0) {
        return next(new ErrorResponse('No active users found', 404));
    }
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    // Send email to each user
    for (const user of users) {
        try {
            await sendEmail({
                email: user.email,
                subject: subject,
                message: message,
                html: html || `<p>${message}</p>`
            });
            successCount++;
        } catch (error) {
            failCount++;
            errors.push({ email: user.email, error: error.message });
        }
    }
    
    res.status(200).json({
        success: true,
        data: {
            totalUsers: users.length,
            successCount,
            failCount,
            errors: errors.length > 0 ? errors : undefined
        },
        message: `Email sent to ${successCount} out of ${users.length} users`
    });
});
