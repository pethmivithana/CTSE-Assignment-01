// File: schedulers/index.js
const deliveryService = require('../services/deliveryService');
const logger = require('../utils/logger');

// Initialize schedulers
exports.initSchedulers = () => {
  // Process pending deliveries every 30 seconds
  setInterval(async () => {
    logger.debug('Running scheduled task: Process pending deliveries');
    await deliveryService.processPendingDeliveries();
  }, 30000);
  
  logger.info('Schedulers initialized');
};
