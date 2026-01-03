const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');

// Load env vars
dotenv.config();

// Connect to database
const connectDB = require('./config/db');

// Route files
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const videoRoutes = require('./routes/videoRoutes');

// Error handler
const errorHandler = require('./middleware/error');

// Initialize app
const app = express();

// Trust proxy for Render
app.set('trust proxy', 1);

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Enable CORS for Next.js frontend
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Sanitize data
app.use(mongoSanitize());

// Set security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // Limit each IP to 1000 requests per windowMs
});
app.use('/api', limiter);

// Prevent http param pollution
app.use(hpp());

// Mount routers
app.use('/api/v1/auth/admin', adminRoutes);
app.use('/api/v1/auth/user', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/videos', videoRoutes);

// Health check route
app.get('/', (req, res) => {
    res.send('API is live 🚀');
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Error handler middleware (must be after all routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server function
const startServer = async () => {
    try {
        // Connect to database
        await connectDB();
        
        const server = app.listen(PORT, () => {
            console.log(`
            🚀 Server running in ${process.env.NODE_ENV} mode
            📍 Port: ${PORT}
            🌐 Frontend: ${process.env.BASE_URL}
            🔗 API: http://localhost:${PORT}/api/v1
            🗄️  MongoDB: Atlas Connected
            👑 Admin: ${process.env.ADMIN_EMAIL}
            `.cyan.bold);
            
            console.log('\n📋 Available endpoints:');
            console.log('POST   /api/v1/auth/admin/login');
            console.log('GET    /api/v1/auth/admin/me');
            console.log('POST   /api/v1/auth/admin/register');
            console.log('GET    /api/v1/auth/admin/admins');
            console.log('\n🔧 Run "node setupAdmin.js" to create admin user');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err, promise) => {
            console.log(`❌ Error: ${err.message}`.red);
            server.close(() => process.exit(1));
        });

    } catch (error) {
        console.error(`❌ Failed to start server: ${error.message}`.red);
        process.exit(1);
    }
};

startServer();