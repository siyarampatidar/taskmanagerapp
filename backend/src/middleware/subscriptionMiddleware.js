const Company = require('../models/Company');

const checkSubscription = async (req, res, next) => {
    try {
        // Skip check for superadmin
        if (req.user && req.user.role === 'superadmin') {
            return next();
        }

        const companyId = req.user?.companyId;
        if (!companyId) return next();

        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

        const now = new Date();
        const isExpired = company.expiryDate && new Date(company.expiryDate) < now;

        // Allow GET requests always (Read-only mode)
        if (req.method === 'GET') {
            return next();
        }

        // Block write operations if inactive or expired
        if (!company.isActive || isExpired) {
            return res.status(403).json({ 
                success: false, 
                message: 'Your subscription has expired. Please renew your plan to perform this action.',
                subscriptionExpired: true 
            });
        }

        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Subscription check failed', error: error.message });
    }
};

module.exports = checkSubscription;
