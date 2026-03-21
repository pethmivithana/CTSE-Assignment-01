const jwt = require('jsonwebtoken');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

exports.authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied: No token provided' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      if (response.data?.status && response.data?.user) {
        req.user = response.data.user;
        req.token = token;
        return next();
      }
    } catch (apiErr) {
      console.warn('User service profile fetch failed:', apiErr.message);
    }
    req.user = {
      _id: decoded.id || decoded._id,
      role: decoded.role,
      restaurantInfo: {},
      contactNumber: '',
      email: ''
    };
    req.token = token;
    next();
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Authentication failed';
    res.status(err.response?.status || 401).json({ success: false, message: msg });
  }
};

exports.restaurantManagerMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'restaurantManager') {
    return res.status(403).json({ success: false, message: 'Restaurant manager access required' });
  }
  next();
};

exports.customerMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'Customer access required' });
  }
  next();
};
