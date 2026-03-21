const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Authenticate JWT token
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn(`Invalid token: ${err.message}`);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
};

// Authorize driver (can only access their own data)
exports.authorizeDriver = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const requestedDriverId = req.params.id;
  
  // Check if requesting user is the driver or has admin privileges (accept deliveryPerson or DRIVER)
  if ((req.user.role === 'DRIVER' || req.user.role === 'deliveryPerson') && req.user.driverId === requestedDriverId) {
    next();
  } else if (req.user.role === 'ADMIN' || req.user.role === 'admin') {
    next();
  } else {
    logger.warn(`Unauthorized driver access attempt: User ${req.user.id} tried to access driver ${requestedDriverId}`);
    return res.status(403).json({ error: 'Unauthorized access' });
  }
};

// Authorize admin
exports.authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!['ADMIN', 'admin'].includes(req.user.role)) {
    logger.warn(`Unauthorized admin access attempt: User ${req.user.id} with role ${req.user.role}`);
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
};
