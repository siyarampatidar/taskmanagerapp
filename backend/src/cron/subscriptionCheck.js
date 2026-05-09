const cron = require('node-cron');
const Company = require('../models/Company');
const User = require('../models/User');
const { sendSubscriptionAlert } = require('../services/emailService');

// Runs every day at midnight
cron.schedule('0 0 * * *', async () => {
    // console.log('[CRON] Running daily subscription check...');
    try {
        const today = new Date();

        // 1. Mark companies as INACTIVE if expired
        const expired = await Company.updateMany(
            { expiryDate: { $lt: today }, isActive: true },
            { isActive: false }
        );
        if (expired.modifiedCount > 0) {
            // console.log(`[CRON] ${expired.modifiedCount} company subscriptions expired and deactivated.`);
        }

        // 2. Find companies expiring in 3 days and 1 day (for email alerts)
        const in3Days = new Date(today); in3Days.setDate(in3Days.getDate() + 3);
        const in1Day  = new Date(today); in1Day.setDate(in1Day.getDate() + 1);
        const in3d = in3Days.toDateString();
        const in1d = in1Day.toDateString();

        const expiringCompanies = await Company.find({
            isActive: true,
            expiryDate: { $gte: today, $lte: in3Days }
        });

        for (const company of expiringCompanies) {
            const expStr = new Date(company.expiryDate).toDateString();
            
            // Get Admin email
            const admin = await User.findById(company.adminId);
            if (!admin) continue;

            if (expStr === in3d) {
                // console.log(`[CRON] 3-day warning → Company: ${company.name}`);
                await sendSubscriptionAlert(admin.email, company.name, 3);
            } else if (expStr === in1d) {
                // console.log(`[CRON] 1-day URGENT warning → Company: ${company.name}`);
                await sendSubscriptionAlert(admin.email, company.name, 1);
            }
        }
    } catch (error) {
         console.error('[CRON] Error in subscription check:', error);
    }
});
