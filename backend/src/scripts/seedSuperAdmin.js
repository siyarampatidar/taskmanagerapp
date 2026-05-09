const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const existingAdmin = await User.findOne({ role: 'superadmin' });
        if (existingAdmin) {
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('superadmin123', 10);
        
        const superAdmin = new User({
            name: 'Super Admin',
            email: 'superadmin@teamflow.com',
            password: hashedPassword,
            role: 'superadmin',
            companyId: null
        });

        await superAdmin.save();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding SuperAdmin:', error);
        process.exit(1);
    }
};

seedSuperAdmin();
