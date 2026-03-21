const axios = require('axios');
const logger = require('../utils/logger');
const Driver = require('../models/Driver');

const getIo = () => {
  try {
    const { io } = require('./socketService');
    return io;
  } catch {
    return null;
  }
};

// Notify user (customer) through notification service
exports.notifyUser = async (userId, title, data) => {
  try {
    const baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
    const headers = {};
    if (process.env.INTERNAL_API_KEY) headers['x-internal-key'] = process.env.INTERNAL_API_KEY;
    const response = await axios.post(`${baseUrl}/api/notifications/send`, {
      recipientType: 'customer',
      recipientId: userId,
      type: 'DELIVERY_UPDATE',
      title,
      data,
    }, { timeout: 5000, headers });
    
    const io = getIo();
    if (io) io.to(`user_${userId}`).emit('delivery_update', { title, data });
    
    logger.info(`Notification sent to user ${userId}: ${title}`);
    return response.data;
  } catch (err) {
    logger.error(`Failed to send notification to user ${userId}: ${err.message}`);
    return null;
  }
};

// Notify driver through notification service
exports.notifyDriver = async (driverId, title, data) => {
  try {
    const driver = await Driver.findById(driverId).select('userId').lean();
    const baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
    const headers = {};
    if (process.env.INTERNAL_API_KEY) headers['x-internal-key'] = process.env.INTERNAL_API_KEY;
    const response = await axios.post(`${baseUrl}/api/notifications/send`, {
      recipientType: 'driver',
      recipientId: driverId,
      recipientUserId: driver?.userId ? String(driver.userId) : undefined,
      type: 'DELIVERY_REQUEST',
      title,
      data,
    }, { timeout: 5000, headers });
    
    const io = getIo();
    if (io) io.to(`driver_${driverId}`).emit('delivery_request', { title, data });
    
    logger.info(`Notification sent to driver ${driverId}: ${title}`);
    return response.data;
  } catch (err) {
    logger.error(`Failed to send notification to driver ${driverId}: ${err.message}`);
    return null;
  }
};

// Notify restaurant through notification service
exports.notifyRestaurant = async (restaurantId, title, data) => {
  try {
    const baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
    const headers = {};
    if (process.env.INTERNAL_API_KEY) headers['x-internal-key'] = process.env.INTERNAL_API_KEY;
    const response = await axios.post(`${baseUrl}/api/notifications/send`, {
      recipientType: 'restaurant',
      recipientId: restaurantId,
      type: 'DELIVERY_UPDATE',
      title,
      data,
    }, { timeout: 5000, headers });
    
    const io = getIo();
    if (io) io.to(`restaurant_${restaurantId}`).emit('delivery_update', { title, data });
    
    logger.info(`Notification sent to restaurant ${restaurantId}: ${title}`);
    return response.data;
  } catch (err) {
    logger.error(`Failed to send notification to restaurant ${restaurantId}: ${err.message}`);
    return null;
  }
};