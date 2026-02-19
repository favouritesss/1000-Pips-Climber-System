const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    let token = req.header('Authorization')?.replace('Bearer ', '');

    // If no header token, try cookies
    if (!token) {
        token = req.cookies.token;
    }

    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pips1000secret');
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

const adminAuth = (req, res, next) => {
    auth(req, res, () => {
        if (!req.user || req.user.role !== 'admin') {
            console.warn(`Admin access denied for user: ${req.user?.id}, role: ${req.user?.role}`);
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        next();
    });
};

module.exports = { auth, adminAuth };
