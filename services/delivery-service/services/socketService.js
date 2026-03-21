const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

exports.setupSocketEvents = (socketServer) => {
  io = socketServer;
  
  io.use((socket, next) => {
    if (socket.handshake.query && socket.handshake.query.token) {
      jwt.verify(socket.handshake.query.token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.decoded = decoded;
        next();
      });
    } else {
      next(new Error('Authentication error'));
    }
  }).on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Join rooms based on user type
    if (socket.decoded.userId) {
      socket.join(`user_${socket.decoded.userId}`);
    }
    
    if (socket.decoded.driverId) {
      socket.join(`driver_${socket.decoded.driverId}`);
    }
    
    if (socket.decoded.restaurantId) {
      socket.join(`restaurant_${socket.decoded.restaurantId}`);
    }
    
    // Handle driver location updates
    socket.on('update_location', async (data) => {
      try {
        if (!socket.decoded.driverId) {
          return socket.emit('error', { message: 'Not authorized' });
        }
        
        const driverId = socket.decoded.driverId;
        const { latitude, longitude } = data;
        
        // Update driver location in database
        const Driver = require('../models/Driver');
        const driver = await Driver.findById(driverId);
        
        if (!driver) {
          return socket.emit('error', { message: 'Driver not found' });
        }
        
        driver.currentLocation = {
          latitude,
          longitude,
          lastUpdated: Date.now()
        };
        
        await driver.save();
        
        // If driver is on delivery, emit location to customer
        if (driver.currentDelivery) {
          const Delivery = require('../models/Delivery');
          const delivery = await Delivery.findById(driver.currentDelivery);
          
          if (delivery) {
            io.to(`user_${delivery.customerId}`).emit('driver_location', {
              deliveryId: delivery._id,
              location: driver.currentLocation
            });
          }
        }
        
        socket.emit('location_updated', { success: true });
      } catch (err) {
        logger.error(`Error updating driver location via socket: ${err.message}`);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
  
  exports.io = io;
  return io;
};

exports.io = io;