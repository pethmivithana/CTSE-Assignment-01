// middleware/authMiddleware.js for Order Service

const jwt = require('jsonwebtoken');
const axios = require('axios');

// Configuration - Store these in environment variables in production
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';
const JWT_SECRET = process.env.JWT_SECRET || 'jasonwebtoken'; // Must match user service

exports.authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token, access denied' 
      });
    }

    // Verify token locally
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch user from user service to validate token and get current user data
    const response = await axios.get(`${USER_SERVICE_URL}/users/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.data.status) {
      throw new Error('Token validation failed');
    }
    
    // Set user info to request object
    req.user = response.data.user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ 
      success: false, 
      message: 'Authentication failed: ' + (error.response?.data?.message || error.message)
    });
  }
};

// Middleware to check if user is a customer
exports.customerMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Customer role required'
    });
  }
  next();
};

// Middleware to check if user is a restaurant manager
exports.restaurantManagerMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'restaurantManager') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Restaurant manager role required'
    });
  }
  next();
};

// Middleware to check if user is an admin
exports.adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin role required'
    });
  }
  next();
};