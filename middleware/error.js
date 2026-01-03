const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    
    // Log to console for dev
    if (process.env.NODE_ENV === 'development') {
        console.log(err.stack);
    } else {
        console.log(err.message);
    }
    
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found`;
        error = new ErrorResponse(message, 404);
    }
    
    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new ErrorResponse(message, 400);
    }
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        const message = Array.isArray(messages) ? messages.join(', ') : messages;
        error = new ErrorResponse(message, 400);
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = new ErrorResponse(message, 401);
    }
    
    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = new ErrorResponse(message, 401);
    }
    
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

module.exports = errorHandler;  