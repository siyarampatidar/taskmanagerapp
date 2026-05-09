const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'User role not found. Please re-authenticate.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Requires one of: ${allowedRoles.join(', ')}` });
        }

        next();
    };
};

module.exports = roleMiddleware;
