const Company = require('../models/Company');

const planGuard = async (req, res, next) => {
    try {
        // Skip check for superadmin
        if (req.user.role === 'superadmin') {
            return next();
        }

        const companyTokenId = req.user.companyId;
        if (!companyTokenId) {
            return res.status(403).json({ message: 'Access denied. Account not associated with a company.' });
        }

        const company = await Company.findById(companyTokenId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found.' });
        }

        // Rule 1: Bina plan ke dashboard access nahi (except registration routes where plan is yet to be selected)
        if (!company.planId) {
            return res.status(403).json({ 
                message: 'Subscription plan required. Please select a plan to continue.',
                redirect: '/select-plan'
            });
        }

        // Rule 2 & 5: Subscription expired status
        if (!company.isActive) {
            return res.status(403).json({ 
                message: 'Your subscription is inactive. Please contact support or renew your plan.',
                redirect: '/select-plan'
            });
        }

        const today = new Date();
        if (company.expiryDate && company.expiryDate < today) {
            return res.status(403).json({ 
                message: 'Your subscripiton has expired. Access blocked.',
                redirect: '/select-plan'
            });
        }

        next();
    } catch (error) {
        console.error('PlanGuard Error:', error);
        res.status(500).json({ message: 'Internal server error during plan verification.' });
    }
};

module.exports = planGuard;
