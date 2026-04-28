const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const Driver = require('../models/Driver');

// Authenticate JWT token
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  const secret = process.env.JWT_SECRET || 'jasonwebtoken';
  jwt.verify(token, secret, (err, user) => {
    if (err) {
      logger.warn(`Invalid token: ${err.message}`);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  });
};

// Authorize driver (can only access their own data). JWT has { id, role } — resolve driver id from DB.
exports.authorizeDriver = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const requestedDriverId = req.params.id;

  try {
    if (req.user.role === 'ADMIN' || req.user.role === 'admin') {
      return next();
    }

    if (req.user.role === 'DRIVER' || req.user.role === 'deliveryPerson') {
      const driverDoc = await Driver.findOne({ userId: String(req.user.id) });
      const driverMongoId = driverDoc?._id?.toString();
      if (driverMongoId && driverMongoId === requestedDriverId) {
        return next();
      }
    }

    logger.warn(`Unauthorized driver access attempt: User ${req.user.id} tried to access driver ${requestedDriverId}`);
    return res.status(403).json({ error: 'Unauthorized access' });
  } catch (err) {
    logger.error(`authorizeDriver: ${err.message}`);
    return res.status(500).json({ error: 'Authorization failed' });
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
