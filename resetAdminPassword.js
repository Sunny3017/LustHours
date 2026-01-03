require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
    try {
        console.log('🔧 Resetting admin password...\n');
        
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
        
        // Find admin
        console.log('3. Finding admin...');
        const admin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        
        if (!admin) {
            console.log(`❌ Admin not found with email: ${process.env.ADMIN_EMAIL}`);
            console.log('👉 Run "node setupAdmin.js" to create admin user first');
            await mongoose.connection.close();
            process.exit(1);
        }
        
        // Update password
        console.log('4. Resetting password...');
        admin.password = process.env.ADMIN_PASSWORD;
        await admin.save();
        
        console.log('\n🎉 PASSWORD RESET SUCCESSFULLY!\n');
        console.log('========================================');
        console.log('   LOGIN CREDENTIALS:');
        console.log('========================================');
        console.log(`   📧 Email: ${process.env.ADMIN_EMAIL}`);
        console.log(`   🔑 Password: ${process.env.ADMIN_PASSWORD}`);
        console.log(`   👑 Role: ${admin.role}`);
        console.log('========================================\n');
        
        // Close connection
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\n🔧 Troubleshooting tips:');
        console.log('1. Check your MONGODB_URI in .env file');
        console.log('2. Make sure MongoDB Atlas cluster is running');
        console.log('3. Check if IP is whitelisted in MongoDB Atlas');
        console.log('4. Verify ADMIN_EMAIL and ADMIN_PASSWORD in .env file');
        process.exit(1);
    }
}

// Run the reset
resetAdminPassword();

