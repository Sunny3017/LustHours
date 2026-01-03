const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
    try {
        // Check if Admin model exists
        let Admin;
        try {
            Admin = mongoose.model('Admin');
        } catch {
            Admin = require('../models/Admin');
        }
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        
        if (!existingAdmin) {
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
            
            const admin = new Admin({
                name: 'Super Admin',
                email: process.env.ADMIN_EMAIL,
                password: hashedPassword,
                role: 'superadmin',
                permissions: {
                    users: { view: true, create: true, edit: true, delete: true },
                    products: { view: true, create: true, edit: true, delete: true },
                    orders: { view: true, update: true },
                    analytics: { view: true }
                }
            });
            
            await admin.save();
            console.log(`✅ Default superadmin created: ${process.env.ADMIN_EMAIL}`.green.bold);
        } else {
            console.log('✅ Super admin already exists'.yellow);
        }
    } catch (error) {
        console.error('❌ Error seeding admin:', error.message);
    }
};

module.exports = seedAdmin;