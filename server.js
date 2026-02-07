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
const path = require('path');
const prerender = require('prerender-node');
const mongoose = require('mongoose');
const compression = require('compression');

const Video = require('./models/Video');

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
const playboyJobRoutes = require('./routes/playboyJobRoutes');

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

app.use(
    compression({
        threshold: 1024,
        filter(req, res) {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        }
    })
);

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

const allowedOrigins = [
    'https://lusthours.fun',
    'https://www.lusthours.fun',
    process.env.BASE_URL,
    'http://localhost:5173',
    'http://localhost:3000'
].filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());

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
app.use('/api/v1/playboy-job', playboyJobRoutes);

const generateSeoSlug = (title) => {
    return String(title || '')
        .toLowerCase()
        .trim()
        .replace(/[\s\-_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

const escapeXml = (str) => {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

app.get('/watch/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return next();
        }

        const video = await Video.findById(id).select('title');

        if (!video) {
            return next();
        }

        const slug = generateSeoSlug(video.title);
        const canonicalPath = `/watch/${video._id.toString()}/${slug}`;

        return res.redirect(301, canonicalPath);
    } catch (err) {
        return next(err);
    }
});

app.get('/watch/:id/:slug', async (req, res, next) => {
    try {
        const { id, slug } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return next();
        }

        const video = await Video.findById(id).select('title');

        if (!video) {
            return next();
        }

        const expectedSlug = generateSeoSlug(video.title);

        if (!expectedSlug) {
            return next();
        }

        if (slug !== expectedSlug) {
            const canonicalPath = `/watch/${video._id.toString()}/${expectedSlug}`;
            return res.redirect(301, canonicalPath);
        }

        return next();
    } catch (err) {
        return next(err);
    }
});

// Dynamic sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || 'https://lusthours.fun';
        
        const videos = await Video.find({ status: 'approved' })
            .select('_id title description thumbnailUrl createdAt updatedAt duration views')
            .sort({ updatedAt: -1 })
            .lean();
        
        const xmlUrls = [
            `
    <url>
        <loc>${baseUrl}/</loc>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>`,
            ...videos.map(video => {
                const seoSlug = generateSeoSlug(video.title || '');
                const loc = seoSlug
                    ? `${baseUrl}/watch/${video._id.toString()}/${seoSlug}`
                    : `${baseUrl}/watch/${video._id.toString()}`;
                const lastmod = video.updatedAt ? video.updatedAt.toISOString() : undefined;
                const uploadDate = video.createdAt ? video.createdAt.toISOString() : undefined;
                const duration = typeof video.duration === 'number' ? video.duration : 0;
                const views = typeof video.views === 'number' ? video.views : 0;
                const title = escapeXml(video.title || '');
                const description = escapeXml(video.description || '');
                const thumbnail = video.thumbnailUrl || '';

                return `
    <url>
        <loc>${loc}</loc>${lastmod ? `
        <lastmod>${lastmod}</lastmod>` : ''}
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
        <video:video>
            <video:title>${title}</video:title>${description ? `
            <video:description>${description}</video:description>` : ''}${thumbnail ? `
            <video:thumbnail_loc>${thumbnail}</video:thumbnail_loc>` : ''}${uploadDate ? `
            <video:publication_date>${uploadDate}</video:publication_date>` : ''}${duration ? `
            <video:duration>${duration}</video:duration>` : ''}${views ? `
            <video:view_count>${views}</video:view_count>` : ''}
            <video:player_loc>${loc}</video:player_loc>
        </video:video>
    </url>`;
            })
        ].join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${xmlUrls}
</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.BASE_URL || 'https://lusthours.fun';

    const robots = [
        'User-agent: *',
        'Allow: /',
        '',
        'Disallow: /api/',
        '',
        `Sitemap: ${baseUrl}/sitemap.xml`,
        ''
    ].join('\n');

    res.type('text/plain').send(robots);
});

// Health check route
app.get('/', (req, res) => {
    res.send('API is live 🚀');
});

if (process.env.NODE_ENV === 'production') {
    const prerenderToken = process.env.PRERENDER_TOKEN || '';

    if (prerenderToken) {
        app.use(
            prerender
                .set('prerenderToken', prerenderToken)
                .set('protocol', 'https')
                .whitelisted(['/watch', '/watch/*'])
        );
    }

    const frontendPath = path.join(__dirname, '../frontend/dist');
    app.use(
        express.static(frontendPath, {
            maxAge: '30d',
            setHeaders(res, filePath) {
                if (filePath.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-cache');
                } else if (
                    filePath.endsWith('.js') ||
                    filePath.endsWith('.css') ||
                    filePath.endsWith('.png') ||
                    filePath.endsWith('.jpg') ||
                    filePath.endsWith('.jpeg') ||
                    filePath.endsWith('.webp') ||
                    filePath.endsWith('.avif') ||
                    filePath.endsWith('.svg')
                ) {
                    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
                }
            }
        })
    );

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }

        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

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

const removeVideoUniqueIndexes = async () => {
    try {
        const indexes = await Video.collection.indexes();
        for (const index of indexes) {
            if (index.unique && index.name !== '_id_') {
                await Video.collection.dropIndex(index.name);
            }
        }
    } catch (err) {
        console.error('Failed to adjust video indexes:', err.message);
    }
};

const startServer = async () => {
    try {
        await connectDB();
        await removeVideoUniqueIndexes();
        
        const server = app.listen(PORT, () => {
            console.log(`
            🚀 Server running in ${process.env.NODE_ENV} mode
            📍 Port: ${PORT}
            🌐 Frontend: ${process.env.BASE_URL}
            🔗 API: http://localhost:${PORT}/api/v1
            🗄️  MongoDB: Atlas Connected
            👑 Admin: ${process.env.ADMIN_EMAIL}
               Everything is oki hai chadhary sahb
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
