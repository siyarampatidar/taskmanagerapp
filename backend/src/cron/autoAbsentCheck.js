const cron = require('node-cron');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Company = require('../models/Company');

// Runs every day at 11:30 PM
cron.schedule('30 23 * * *', async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Skip Sundays
        if (today.getDay() === 0) {
            return;
        }

        // Get all active companies
        const companies = await Company.find({ isActive: true });

        for (const company of companies) {
            // Get all employees of this company (non-admin)
            const employees = await User.find({
                companyId: company._id,
                role: { $in: ['employee', 'sales', 'marketing', 'manager', 'teamhead', 'hr'] }
            }).select('_id');

            for (const emp of employees) {
                // Check if attendance record exists for today
                const existing = await Attendance.findOne({
                    userId: emp._id,
                    companyId: company._id,
                    date: today
                });

                // If no record at all → mark as absent
                if (!existing) {
                    await Attendance.create({
                        userId: emp._id,
                        companyId: company._id,
                        date: today,
                        status: 'absent'
                    });
                    continue;
                }

                // If record exists but employee never checked in → mark as absent
                // (status is still the default or no checkIn time)
                if (!existing.checkIn && existing.status === 'present') {
                    existing.status = 'absent';
                    await existing.save();
                }
            }
        }

    } catch (error) {
        console.error('[CRON] Error in auto-absent check:', error);
    }
});
