const ActivityLog = require('../models/ActivityLog');

const logActivity = async ({ action, details, userId, companyId, referenceId, referenceType }) => {
    try {
        await ActivityLog.create({
            action, details, userId, companyId, referenceId, referenceType
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

module.exports = { logActivity };
