const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Lead = require('../models/Lead');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const backfillLeadDepartments = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const leads = await Lead.find({ departmentId: null });

        for (const lead of leads) {
            const creator = await User.findById(lead.createdBy);
            if (creator && creator.departmentId) {
                lead.departmentId = creator.departmentId;
                await lead.save();
            } else {
                // console.log(`Could not find department for Lead ${lead.name} (Creator: ${lead.createdBy})`);
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Error backfilling leads:', error);
        process.exit(1);
    }
};

backfillLeadDepartments();
