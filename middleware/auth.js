const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const Admin = require('../models/Admin');
const User = require('../models/User');

// Protect routes for Admin
exports.protect = asyncHandler(async (req, res, next) => {
    let token;
    
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        // Set token from cookie
        token = req.cookies.token;
    }
    
    // Make sure token exists
    if (!token) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
    
    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if admin still exists
        req.admin = await Admin.findById(decoded.id);
        if (!req.admin) {
            return next(new ErrorResponse('The admin belonging to this token no longer exists', 401));
        }
        
        // Check if admin is active
        if (!req.admin.isActive) {
            return next(new ErrorResponse('Your account has been deactivated', 401));
        }
        
        // Check if password was changed after token was issued
        if (req.admin.changedPasswordAfter(decoded.iat)) {
            return next(new ErrorResponse('Admin recently changed password. Please login again', 401));
        }
        
        next();
    } catch (err) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
});

// Protect routes for User
exports.protectUser = asyncHandler(async (req, res, next) => {
    let token;
    
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    
    if (!token) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        req.user = await User.findById(decoded.id);
        if (!req.user) {
            return next(new ErrorResponse('The user belonging to this token no longer exists', 401));
        }
        
        if (req.user.isActive === false) {
             return next(new ErrorResponse('Your account has been deactivated', 401));
        }

        next();
    } catch (err) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
});

// Protect routes for User or Admin
exports.protectAny = asyncHandler(async (req, res, next) => {
    let token;
    
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    
    if (!token) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if admin
        const admin = await Admin.findById(decoded.id);
        if (admin) {
            if (!admin.isActive) {
                return next(new ErrorResponse('Your account has been deactivated', 401));
            }
            req.admin = admin;
            return next();
        }

        // Check if user
        const user = await User.findById(decoded.id);
        if (user) {
            if (user.isActive === false) {
                 return next(new ErrorResponse('Your account has been deactivated', 401));
            }
            req.user = user;
            return next();
        }

        return next(new ErrorResponse('User/Admin not found', 401));
    } catch (err) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
});

// Grant access to specific roles (Admin or User with admin role)
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Check if admin (from Admin model)
        if (req.admin) {
            // Admin model roles: 'superadmin', 'admin', 'moderator'
            if (roles.includes(req.admin.role)) {
                return next();
            }
            return next(
                new ErrorResponse(
                    `Admin role ${req.admin.role} is not authorized to access this route`,
                    403
                )
            );
        }
        
        // Check if user with admin role (from User model)
        if (req.user) {
            // User model roles: 'user', 'admin'
            if (req.user.role === 'admin' && roles.includes('admin')) {
                return next();
            }
            return next(
                new ErrorResponse(
                    `User role ${req.user.role} is not authorized to access this route`,
                    403
                )
            );
        }
        
        return next(new ErrorResponse('Not authorized - authentication required', 403));
    };
};

// Optional authentication
exports.optionalAuth = asyncHandler(async (req, res, next) => {
    let token;
    
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        return next();
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        // Try to find admin first, then user
        const admin = await Admin.findById(decoded.id);
        if (admin) {
            req.admin = admin;
        } else {
            const user = await User.findById(decoded.id);
            if (user) {
                req.user = user;
            }
        }
        next();
    } catch (err) {
        return next();
    }
});
