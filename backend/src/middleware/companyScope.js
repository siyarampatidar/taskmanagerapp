/**
 * Ensures that the companyId is present in req.user and enforces multi-tenancy.
 * This can also be used to automatically inject companyId into req.body for create operations.
 */
const companyScope = (req, res, next) => {
    if (req.user && req.user.role !== 'superadmin') {
        if (!req.user.companyId) {
            return res.status(400).json({ message: 'Multi-tenancy error: Company ID missing from token scope.' });
        }
        
        // Inject companyId into body for all POST/PUT requests to ensure isolation
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            req.body.companyId = req.user.companyId;
        }
    }
    next();
};

module.exports = companyScope;
