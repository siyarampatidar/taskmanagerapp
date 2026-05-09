const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains id, role, companyId, etc.
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `User role ${req.user.role} is not authorized to access this route` 
            });
        }
        next();
    };
};

// Export logic: return protect as the default function, but allow destructuring
const middleware = protect;
middleware.protect = protect;
middleware.authorize = authorize;
middleware.authMiddleware = protect;

module.exports = middleware;
