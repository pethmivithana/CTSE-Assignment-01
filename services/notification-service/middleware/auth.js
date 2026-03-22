const jwt = require('jsonwebtoken');

// Must match user-service and API gateway (same JWT_SECRET in .env / docker-compose)
const JWT_SECRET = process.env.JWT_SECRET;

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('notification-service: JWT_SECRET is not set');
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};
