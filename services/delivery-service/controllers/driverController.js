// File: controllers/driverController.js
const Driver = require('../models/Driver');
const Delivery = require('../models/Delivery');
const { validateDriverData } = require('../utils/validation');
const logger = require('../utils/logger');
const { notifyUser, notifyRestaurant } = require('../services/notificationService');
const deliveryService = require('../services/deliveryService');
const routeService = require('../services/routeService');

function ensureDeliveryOtp(delivery) {
  if (delivery.status === 'ON_THE_WAY' && !delivery.deliveryOtp) {
    delivery.deliveryOtp = String(Math.floor(100000 + Math.random() * 900000));
    delivery.deliveryOtpExpires = new Date(Date.now() + 45 * 60 * 1000);
  }
}

// Register a new driver from user management service
exports.registerDriver = async (req, res) => {
  try {
    const { error } = validateDriverData(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ userId: req.body.userId });
    if (existingDriver) {
      return res.status(409).json({ error: 'Driver already registered' });
    }

    // Create new driver
    const driver = new Driver({
      userId: req.body.userId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      vehicleType: req.body.vehicleType,
      vehicleDetails: req.body.vehicleDetails,
      isVerified: req.body.isVerified || true
    });

    await driver.save();
    logger.info(`New driver registered: ${driver._id}`);
    
    return res.status(201).json({
      message: 'Driver registered successfully',
      driver: {
        id: driver._id,
        name: driver.name,
        status: driver.status,
        isVerified: driver.isVerified
      }
    });
  } catch (err) {
    logger.error(`Error registering driver: ${err.message}`);
    return res.status(500).json({ error: 'Failed to register driver' });
  }
};

// Get driver by current user (for dashboard)
exports.getDriverByUser = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const driver = await Driver.findOne({ userId: String(userId) });
    if (!driver) return res.status(404).json({ error: 'Driver not found. Please complete registration.' });
    return res.status(200).json({
      driver: {
        id: driver._id,
        userId: driver.userId,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        isAvailable: driver.isAvailable,
        isVerified: driver.isVerified,
        status: driver.status,
        rating: driver.rating,
        totalDeliveries: driver.totalDeliveries,
        vehicleType: driver.vehicleType,
        vehicleDetails: driver.vehicleDetails,
        licenseNumber: driver.licenseNumber,
        licenseDocumentUrl: driver.licenseDocumentUrl,
        documentsVerified: driver.documentsVerified,
        currentLocation: driver.currentLocation
      }
    });
  } catch (err) {
    logger.error(`Error fetching driver by user: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch driver profile' });
  }
};

/** Update license / vehicle (authenticated driver) */
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const driver = await Driver.findOne({ userId: String(userId) });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const { licenseNumber, licenseDocumentUrl, licenseExpiry, vehicleDetails, vehicleType } = req.body;
    if (licenseNumber != null) driver.licenseNumber = licenseNumber;
    if (licenseDocumentUrl != null) driver.licenseDocumentUrl = licenseDocumentUrl;
    if (licenseExpiry != null) driver.licenseExpiry = licenseExpiry ? new Date(licenseExpiry) : null;
    if (vehicleDetails != null) driver.vehicleDetails = { ...driver.vehicleDetails, ...vehicleDetails };
    if (vehicleType != null) driver.vehicleType = vehicleType;

    await driver.save();
    return res.json({ message: 'Profile updated', driver: { id: driver._id } });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Get driver profile
exports.getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    return res.status(200).json({
      driver: {
        id: driver._id,
        userId: driver.userId,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        isAvailable: driver.isAvailable,
        isVerified: driver.isVerified,
        status: driver.status,
        rating: driver.rating,
        totalDeliveries: driver.totalDeliveries,
        vehicleType: driver.vehicleType,
        vehicleDetails: driver.vehicleDetails
      }
    });
  } catch (err) {
    logger.error(`Error fetching driver profile: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch driver profile' });
  }
};

// Update driver availability
exports.updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ error: 'isAvailable must be a boolean' });
    }
    
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    if (!driver.isVerified) {
      return res.status(403).json({ error: 'Driver not verified yet' });
    }
    
    driver.isAvailable = isAvailable;
    driver.status = isAvailable ? 'AVAILABLE' : 'OFFLINE';
    
    await driver.save();
    logger.info(`Driver ${driver._id} availability updated to ${isAvailable}`);
    
    return res.status(200).json({
      message: `Driver status updated to ${isAvailable ? 'available' : 'unavailable'}`,
      driver: {
        id: driver._id,
        isAvailable: driver.isAvailable,
        status: driver.status
      }
    });
  } catch (err) {
    logger.error(`Error updating driver availability: ${err.message}`);
    return res.status(500).json({ error: 'Failed to update driver availability' });
  }
};

// Update driver location
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    driver.currentLocation = {
      latitude,
      longitude,
      lastUpdated: new Date()
    };
    driver.lastActiveAt = new Date();
    await driver.save();

    // Append to delivery's driverLocationHistory (throttle: ~every 100m or 30s)
    if (driver.currentDelivery && driver.status === 'ON_DELIVERY') {
      const delivery = await Delivery.findById(driver.currentDelivery);
      if (delivery) {
        const hist = delivery.driverLocationHistory || [];
        const last = hist[hist.length - 1];
        const now = Date.now();
        const shouldAppend = !last || (now - new Date(last.timestamp).getTime() > 30000);
        if (shouldAppend) {
          delivery.driverLocationHistory = delivery.driverLocationHistory || [];
          delivery.driverLocationHistory.push({
            latitude,
            longitude,
            timestamp: new Date()
          });
          await delivery.save();
        }
      }
    }
    
    // If driver is on delivery, update delivery status to ON_THE_WAY if needed
    if (driver.currentDelivery && driver.status === 'ON_DELIVERY') {
      const delivery = await Delivery.findById(driver.currentDelivery);
      if (delivery && delivery.status === 'PICKED_UP') {
        delivery.updateStatus('ON_THE_WAY', 'Driver is on the way to customer');
        ensureDeliveryOtp(delivery);
        const etaMin = routeService.etaMinutesFromDriver(
          latitude,
          longitude,
          delivery.dropoffLocation.latitude,
          delivery.dropoffLocation.longitude,
        );
        const eta = new Date();
        eta.setMinutes(eta.getMinutes() + etaMin);
        delivery.currentEta = eta;
        await delivery.save();

        await notifyUser(delivery.customerId, 'Driver is on the way with your order!', {
          deliveryId: delivery._id,
          status: 'ON_THE_WAY',
          driverLocation: driver.currentLocation,
          deliveryCode: delivery.deliveryOtp,
          estimatedArrivalMinutes: etaMin,
        });
        try {
          const orderService = require('../services/orderService');
          await orderService.updateOrderStatus(delivery.orderId, 'OUT_FOR_DELIVERY');
        } catch (orderErr) {
          logger.warn(`Order OUT_FOR_DELIVERY sync failed: ${orderErr.message}`);
        }
      } else if (delivery && delivery.status === 'ON_THE_WAY' && driver.currentLocation?.latitude) {
        const etaMin = routeService.etaMinutesFromDriver(
          latitude,
          longitude,
          delivery.dropoffLocation.latitude,
          delivery.dropoffLocation.longitude,
        );
        const eta = new Date();
        eta.setMinutes(eta.getMinutes() + etaMin);
        delivery.currentEta = eta;
        await delivery.save();
      }
    }
    
    return res.status(200).json({
      message: 'Location updated successfully',
      location: driver.currentLocation
    });
  } catch (err) {
    logger.error(`Error updating driver location: ${err.message}`);
    return res.status(500).json({ error: 'Failed to update driver location' });
  }
};

// Get driver's current and past deliveries
exports.getDriverDeliveries = async (req, res) => {
  try {
    const driverId = req.params.id;
    
    // Get current delivery
    const currentDelivery = await Delivery.findOne({
      driverId: driverId,
      status: { $in: ['DRIVER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'] }
    });
    
    // Get completed deliveries (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const completedDeliveries = await Delivery.find({
      driverId: driverId,
      status: 'DELIVERED',
      updatedAt: { $gte: thirtyDaysAgo }
    }).sort({ updatedAt: -1 });
    
    return res.status(200).json({
      currentDelivery: currentDelivery || null,
      completedDeliveries: completedDeliveries || []
    });
  } catch (err) {
    logger.error(`Error fetching driver deliveries: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch driver deliveries' });
  }
};

// Accept delivery
exports.acceptDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.body;
    const driverId = req.params.id;

    if (!deliveryId) {
      return res.status(400).json({ error: 'Delivery ID is required' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    await deliveryService.assignDriverToDelivery(deliveryId, driverId, `Assigned to driver: ${driver.name}`);

    const delivery = await Delivery.findById(deliveryId);

    logger.info(`Driver ${driverId} accepted delivery ${deliveryId}`);

    return res.status(200).json({
      message: 'Delivery accepted successfully',
      delivery: {
        id: delivery._id,
        status: delivery.status,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime,
        pickupLocation: delivery.pickupLocation,
        dropoffLocation: delivery.dropoffLocation,
        routeGeometry: delivery.routeGeometry,
      },
    });
  } catch (err) {
    logger.error(`Error accepting delivery: ${err.message}`);
    return res.status(400).json({ error: err.message || 'Failed to accept delivery' });
  }
};

// Reject delivery
exports.rejectDelivery = async (req, res) => {
  try {
    const { deliveryId, reason } = req.body;
    const driverId = req.params.id;
    
    if (!deliveryId) {
      return res.status(400).json({ error: 'Delivery ID is required' });
    }
    
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    // Add driver to rejected list
    delivery.rejectedBy.push({
      driverId: driverId,
      reason: reason || 'No reason provided',
      timestamp: Date.now()
    });
    
    delivery.deliveryAttempts += 1;
    await delivery.save();
    
    logger.info(`Driver ${driverId} rejected delivery ${deliveryId}`);
    
    deliveryService.assignDeliveryToDriver(delivery._id);
    
    return res.status(200).json({
      message: 'Delivery rejected successfully',
      deliveryId: delivery._id
    });
  } catch (err) {
    logger.error(`Error rejecting delivery: ${err.message}`);
    return res.status(500).json({ error: 'Failed to reject delivery' });
  }
};

// Update delivery status
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status, note, deliveryOtp, photoBase64 } = req.body;
    const driverId = req.params.id;
    const deliveryId = req.params.deliveryId;

    const validStatusTransitions = {
      DRIVER_ASSIGNED: ['PICKED_UP', 'CANCELLED'],
      PICKED_UP: ['ON_THE_WAY', 'CANCELLED'],
      ON_THE_WAY: ['DELIVERED', 'CANCELLED', 'FAILED'],
    };

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    if (delivery.driverId.toString() !== driverId) {
      return res.status(403).json({ error: 'This delivery is not assigned to you' });
    }

    if (!validStatusTransitions[delivery.status] || !validStatusTransitions[delivery.status].includes(status)) {
      return res.status(400).json({
        error: `Invalid status transition from ${delivery.status} to ${status}`,
      });
    }

    if (status === 'DELIVERED' && delivery.deliveryOtp) {
      if (!deliveryOtp || String(deliveryOtp).trim() !== String(delivery.deliveryOtp)) {
        return res.status(400).json({ error: 'Invalid delivery confirmation code from customer' });
      }
    }

    delivery.updateStatus(status, note || '');
    if (status === 'ON_THE_WAY') {
      ensureDeliveryOtp(delivery);
      await notifyUser(delivery.customerId, 'Your delivery confirmation code', {
        deliveryId: delivery._id,
        orderId: delivery.orderId,
        deliveryCode: delivery.deliveryOtp,
        message: 'Give this code to the driver to complete delivery.',
      });
      try {
        const orderService = require('../services/orderService');
        await orderService.updateOrderStatus(delivery.orderId, 'OUT_FOR_DELIVERY');
      } catch (orderErr) {
        logger.warn(`Order OUT_FOR_DELIVERY sync failed: ${orderErr.message}`);
      }
    }
    if (status === 'DELIVERED' && photoBase64) {
      delivery.podPhotoUrl = photoBase64.startsWith('data:') ? photoBase64 : `data:image/jpeg;base64,${photoBase64}`;
      delivery.podVerifiedAt = new Date();
    }
    await delivery.save();
    
    // If delivered, update driver status and order service
    if (status === 'DELIVERED') {
      driver.isAvailable = true;
      driver.status = 'AVAILABLE';
      driver.currentDelivery = null;
      driver.totalDeliveries += 1;
      await driver.save();
      
      // Update order status in order-service
      try {
        const orderService = require('../services/orderService');
        await orderService.updateOrderStatus(delivery.orderId, 'DELIVERED');
      } catch (orderErr) {
        console.warn('Failed to update order status:', orderErr.message);
      }
      
      // Notify customer
      await notifyUser(delivery.customerId, 'Your order has been delivered!', {
        orderId: delivery.orderId,
        deliveryId: delivery._id,
        message: 'Enjoy your meal!'
      });
    } else if (status === 'PICKED_UP') {
      // Sync order lifecycle: driver picked up → PICKED_UP (out for delivery)
      try {
        const orderService = require('../services/orderService');
        await orderService.updateOrderStatus(delivery.orderId, 'PICKED_UP');
      } catch (orderErr) {
        console.warn('Failed to sync order status:', orderErr.message);
      }
      // Notify customer
      await notifyUser(delivery.customerId, 'Driver has picked up your order', {
        orderId: delivery.orderId,
        deliveryId: delivery._id,
        driverName: driver.name,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime
      });
      
      // Notify restaurant
      await notifyRestaurant(delivery.restaurantId, 'Order picked up', {
        orderId: delivery.orderId,
        deliveryId: delivery._id,
        driverName: driver.name
      });
    }
    
    logger.info(`Delivery ${deliveryId} status updated to ${status}`);
    
    return res.status(200).json({
      message: `Delivery status updated to ${status}`,
      delivery: {
        id: delivery._id,
        status: delivery.status,
        updatedAt: delivery.updatedAt
      }
    });
  } catch (err) {
    logger.error(`Error updating delivery status: ${err.message}`);
    return res.status(500).json({ error: 'Failed to update delivery status' });
  }
};

// Get all available drivers (admin only)
exports.getAllDrivers = async (req, res) => {
  try {
    // This should be protected with admin authorization
    const drivers = await Driver.find();
    
    return res.status(200).json({
      count: drivers.length,
      drivers: drivers.map(driver => ({
        id: driver._id,
        name: driver.name,
        status: driver.status,
        isAvailable: driver.isAvailable,
        rating: driver.rating,
        totalDeliveries: driver.totalDeliveries
      }))
    });
  } catch (err) {
    logger.error(`Error fetching all drivers: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch drivers' });
  }
};