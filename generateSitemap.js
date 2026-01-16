const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const colors = require('colors');

// Load env vars
dotenv.config({ path: './.env' });

// Define Video Model inline to avoid dependency issues or just require it if structure allows
// Safest is to require, assuming standard structure
const Video = require('./models/Video');

const generateSeoSlug = (title) => {
    return String(title || '')
        .toLowerCase()
        .trim()
        .replace(/[\s\-_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

const escapeXml = (unsafe) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
};

const generateSitemap = async () => {
    try {
        console.log('Connecting to MongoDB...'.yellow);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected'.green);

        const baseUrl = 'https://lusthours.fun'; // Hardcoded production domain
        console.log(`Generating sitemap for ${baseUrl}...`.cyan);

        // Fetch videos
        const videos = await Video.find({ status: 'approved' })
            .select('_id title description thumbnailUrl createdAt updatedAt duration views')
            .sort({ updatedAt: -1 })
            .lean();

        console.log(`Found ${videos.length} approved videos`.blue);

        // Static URLs
        const staticUrls = [
            { loc: '/', priority: '1.0', changefreq: 'daily' },
            { loc: '/trending', priority: '0.8', changefreq: 'daily' },
            { loc: '/explore', priority: '0.8', changefreq: 'weekly' },
            { loc: '/about', priority: '0.5', changefreq: 'monthly' },
            { loc: '/contact', priority: '0.5', changefreq: 'monthly' },
        ];

        let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`;

        // Add Static URLs
        staticUrls.forEach(page => {
            xmlContent += `
    <url>
        <loc>${baseUrl}${page.loc}</loc>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>`;
        });

        // Add Video URLs
        videos.forEach(video => {
            const seoSlug = generateSeoSlug(video.title || '');
            const loc = seoSlug
                ? `${baseUrl}/watch/${video._id.toString()}/${seoSlug}`
                : `${baseUrl}/watch/${video._id.toString()}`;
            
            const lastmod = video.updatedAt ? video.updatedAt.toISOString() : new Date().toISOString();
            const uploadDate = video.createdAt ? video.createdAt.toISOString() : new Date().toISOString();
            const duration = typeof video.duration === 'number' ? Math.round(video.duration) : 0;
            const views = typeof video.views === 'number' ? video.views : 0;
            const title = escapeXml(video.title || 'Untitled Video');
            const description = escapeXml(video.description || 'Watch this video on LustHours');
            const thumbnail = escapeXml(video.thumbnailUrl || `${baseUrl}/default-thumbnail.jpg`);

            xmlContent += `
    <url>
        <loc>${loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
        <video:video>
            <video:title>${title}</video:title>
            <video:description>${description}</video:description>
            <video:thumbnail_loc>${thumbnail}</video:thumbnail_loc>
            <video:publication_date>${uploadDate}</video:publication_date>
            ${duration ? `<video:duration>${duration}</video:duration>` : ''}
            <video:view_count>${views}</video:view_count>
            <video:player_loc>${loc}</video:player_loc>
            <video:family_friendly>no</video:family_friendly>
            <video:live>no</video:live>
        </video:video>
    </url>`;
        });

        xmlContent += `
</urlset>`;

        // Path to frontend public folder
        const outputPath = path.join(__dirname, '../frontend/public/sitemap.xml');
        
        fs.writeFileSync(outputPath, xmlContent);
        console.log(`Sitemap generated successfully at: ${outputPath}`.green.bold);

        process.exit(0);
    } catch (err) {
        console.error(`Error: ${err.message}`.red);
        process.exit(1);
    }
};

generateSitemap();
