require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
    try {
        console.log('🔧 Setting up admin user...\n');
        
        // Connect to DB
        console.log('1. Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB Atlas\n');
        
        // Load Admin model
        console.log('2. Loading Admin model...');
        const Admin = require('./models/Admin');
        
        // Check if admin exists
        console.log('3. Checking if admin exists...');
        const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        
        if (existingAdmin) {
            console.log(`❌ Admin already exists with email: ${process.env.ADMIN_EMAIL}`);
            console.log('👉 You can login with:');
            console.log(`   Email: ${process.env.ADMIN_EMAIL}`);
            console.log(`   Password: ${process.env.ADMIN_PASSWORD}`);
        } else {
            // Create admin
            console.log('4. Creating new admin...');
            
            const admin = new Admin({
                name: 'Super Admin',
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD,
                role: 'superadmin',
                permissions: {
                    users: { view: true, create: true, edit: true, delete: true },
                    products: { view: true, create: true, edit: true, delete: true },
                    orders: { view: true, update: true },
                    analytics: { view: true }
                },
                isActive: true
            });
            
            await admin.save();
            console.log('\n🎉 ADMIN CREATED SUCCESSFULLY!\n');
            console.log('========================================');
            console.log('   LOGIN CREDENTIALS:');
            console.log('========================================');
            console.log(`   📧 Email: ${process.env.ADMIN_EMAIL}`);
            console.log(`   🔑 Password: ${process.env.ADMIN_PASSWORD}`);
            console.log(`   👑 Role: Super Admin`);
            console.log('========================================\n');
            console.log('⚠️  IMPORTANT: Change password after first login!');
        }
        
        // Close connection
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\n🔧 Troubleshooting tips:');
        console.log('1. Check your MONGODB_URI in .env file');
        console.log('2. Make sure MongoDB Atlas cluster is running');
        console.log('3. Check if IP is whitelisted in MongoDB Atlas');
        console.log('4. Verify network connection');
        process.exit(1);
    }
}

// Run the setup
setupAdmin();