const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const logger = require('../utils/logger');
const { validateDeliveryData } = require('../utils/validation');
const deliveryService = require('../services/deliveryService');
const deliveryFeeService = require('../services/deliveryFeeService');
const { notifyUser, notifyRestaurant } = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');

// Create a new delivery request from order management
exports.createDelivery = async (req, res) => {
    try {
        const { error } = validateDeliveryData(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Check if delivery for this order already exists
        const existingDelivery = await Delivery.findOne({ orderId: req.body.orderId });
        if (existingDelivery) {
            return res.status(409).json({
                error: 'Delivery for this order already exists',
                deliveryId: existingDelivery._id
            });
        }

        // Calculate distance using pickup and dropoff coordinates
        const distance = calculateDistance(
            req.body.pickupLocation.latitude,
            req.body.pickupLocation.longitude,
            req.body.dropoffLocation.latitude,
            req.body.dropoffLocation.longitude
        );

        // Create new delivery - CONFIRMED since order already accepted by restaurant
        const delivery = new Delivery({
            orderId: req.body.orderId,
            restaurantId: req.body.restaurantId,
            customerId: req.body.customerId,
            orderDetails: req.body.orderDetails,
            pickupLocation: req.body.pickupLocation,
            dropoffLocation: req.body.dropoffLocation,
            status: 'CONFIRMED',
            distance: distance,
            deliveryNotes: req.body.deliveryNotes || '',
            ...(req.body.deliveryFee != null && { deliveryFee: req.body.deliveryFee })
        });

        // Add initial status to history
        delivery.statusHistory.push({
            status: 'CONFIRMED',
            timestamp: Date.now(),
            note: 'Delivery request created, auto-assigning driver'
        });

        await deliveryService.enrichDeliveryRoute(delivery);
        await delivery.save();
        logger.info(`New delivery created for order ${delivery.orderId}`);

        // Auto-assign driver
        try {
            await deliveryService.assignDeliveryToDriver(delivery._id);
        } catch (assignErr) {
            logger.warn(`Auto-assign failed for delivery ${delivery._id}: ${assignErr.message}`);
        }

        return res.status(201).json({
            message: 'Delivery request created successfully',
            delivery: {
                id: delivery._id,
                orderId: delivery.orderId,
                status: delivery.status,
                distance: delivery.distance
            }
        });
    } catch (err) {
        logger.error(`Error creating delivery: ${err.message}`);
        return res.status(500).json({ error: 'Failed to create delivery request' });
    }
};

// Function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Confirm delivery from restaurant
exports.confirmDelivery = async (req, res) => {
    try {
        const { orderId } = req.params;

        const delivery = await Delivery.findOne({ orderId });
        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        if (delivery.status !== 'PENDING') {
            return res.status(400).json({
                error: `Delivery already in ${delivery.status} state`
            });
        }

        // Update status to CONFIRMED
        delivery.updateStatus('CONFIRMED', 'Order confirmed by restaurant');
        await delivery.save();

        logger.info(`Delivery ${delivery._id} confirmed by restaurant`);

        // Automatically try to assign a driver
        deliveryService.assignDeliveryToDriver(delivery._id);

        return res.status(200).json({
            message: 'Delivery confirmed successfully',
            delivery: {
                id: delivery._id,
                orderId: delivery.orderId,
                status: delivery.status
            }
        });
    } catch (err) {
        logger.error(`Error confirming delivery: ${err.message}`);
        return res.status(500).json({ error: 'Failed to confirm delivery' });
    }
};

// Get delivery by ID
exports.getDeliveryById = async (req, res) => {
    try {
        const delivery = await Delivery.findById(req.params.id)
            .populate('driverId', 'name phone currentLocation rating vehicleDetails');

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        return res.status(200).json({ delivery });
    } catch (err) {
        logger.error(`Error fetching delivery: ${err.message}`);
        return res.status(500).json({ error: 'Failed to fetch delivery details' });
    }
};

// Get delivery by order ID
exports.getDeliveryByOrderId = async (req, res) => {
    try {
        const delivery = await Delivery.findOne({ orderId: req.params.orderId })
            .populate('driverId', 'name phone currentLocation rating vehicleDetails');

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        return res.status(200).json({ delivery });
    } catch (err) {
        logger.error(`Error fetching delivery by order ID: ${err.message}`);
        return res.status(500).json({ error: 'Failed to fetch delivery details' });
    }
};

// Trigger/refresh dispatch for an existing order delivery (used when order becomes READY)
exports.dispatchDeliveryByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;
        const delivery = await Delivery.findOne({ orderId });
        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        if (delivery.status !== 'CONFIRMED') {
            return res.status(400).json({
                error: `Delivery dispatch allowed only in CONFIRMED state (current: ${delivery.status})`
            });
        }

        if (delivery.driverId) {
            return res.status(200).json({
                message: 'Delivery already assigned',
                delivery: { id: delivery._id, status: delivery.status, driverId: delivery.driverId }
            });
        }

        const assigned = await deliveryService.assignDeliveryToDriver(delivery._id);
        return res.status(200).json({
            message: assigned ? 'Dispatch attempted successfully' : 'Dispatch attempted, no driver currently available',
            assigned,
            delivery: { id: delivery._id, status: delivery.status }
        });
    } catch (err) {
        logger.error(`Error dispatching delivery for order ${req.params.orderId}: ${err.message}`);
        return res.status(500).json({ error: 'Failed to dispatch delivery' });
    }
};

// Track delivery status and driver location
exports.trackDelivery = async (req, res) => {
    try {
        const { orderId } = req.params;

        const delivery = await Delivery.findOne({ orderId })
            .populate('driverId', 'name phone currentLocation rating vehicleDetails');

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        // Return tracking info based on delivery status
        const trackingInfo = {
            deliveryId: delivery._id,
            orderId: delivery.orderId,
            status: delivery.status,
            statusHistory: delivery.statusHistory,
            estimatedDeliveryTime: delivery.estimatedDeliveryTime,
            distance: delivery.distance
        };

        // Add driver info if assigned
        if (delivery.driverId) {
            trackingInfo.driver = {
                name: delivery.driverId.name,
                phone: delivery.driverId.phone,
                rating: delivery.driverId.rating,
                vehicleDetails: delivery.driverId.vehicleDetails,
                currentLocation: delivery.driverId.currentLocation
            };
        }
        if (delivery.driverLocationHistory && delivery.driverLocationHistory.length > 0) {
            trackingInfo.driverLocationHistory = delivery.driverLocationHistory;
        }

        trackingInfo.pickupLocation = delivery.pickupLocation;
        trackingInfo.dropoffLocation = delivery.dropoffLocation;
        trackingInfo.routeGeometry = delivery.routeGeometry || null;
        trackingInfo.routeDurationMinutes = delivery.routeDurationMinutes;
        trackingInfo.currentEta = delivery.currentEta;
        trackingInfo.exceptionType = delivery.exceptionType || null;
        trackingInfo.exceptionDetails = delivery.exceptionDetails || null;
        if (delivery.deliveryOtp && ['ON_THE_WAY'].includes(delivery.status)) {
            const code = String(delivery.deliveryOtp);
            trackingInfo.deliveryOtpHint = `******${code.slice(-2)}`;
        }

        return res.status(200).json({ tracking: trackingInfo });
    } catch (err) {
        logger.error(`Error tracking delivery: ${err.message}`);
        return res.status(500).json({ error: 'Failed to fetch tracking information' });
    }
};

/** Authenticated customer (or admin): full tracking including delivery OTP when en route */
exports.trackDeliveryForCustomer = async (req, res) => {
    try {
        const { orderId } = req.params;
        const uid = req.user?.id || req.user?._id;
        const role = req.user?.role;

        const delivery = await Delivery.findOne({ orderId })
            .populate('driverId', 'name phone currentLocation rating vehicleDetails');

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        const isAdmin = ['ADMIN', 'admin'].includes(role);
        const isOwner = uid != null && String(delivery.customerId) === String(uid);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'Not allowed to view this delivery' });
        }

        const trackingInfo = {
            deliveryId: delivery._id,
            orderId: delivery.orderId,
            status: delivery.status,
            statusHistory: delivery.statusHistory,
            estimatedDeliveryTime: delivery.estimatedDeliveryTime,
            currentEta: delivery.currentEta,
            distance: delivery.distance,
            routeGeometry: delivery.routeGeometry,
            routeDurationMinutes: delivery.routeDurationMinutes,
            pickupLocation: delivery.pickupLocation,
            dropoffLocation: delivery.dropoffLocation,
            podVerifiedAt: delivery.podVerifiedAt,
        };

        if (delivery.driverId) {
            trackingInfo.driver = {
                name: delivery.driverId.name,
                phone: delivery.driverId.phone,
                rating: delivery.driverId.rating,
                vehicleDetails: delivery.driverId.vehicleDetails,
                currentLocation: delivery.driverId.currentLocation,
            };
        }
        if (delivery.driverLocationHistory?.length) {
            trackingInfo.driverLocationHistory = delivery.driverLocationHistory;
        }
        if (delivery.status === 'ON_THE_WAY' && delivery.deliveryOtp) {
            trackingInfo.deliveryOtp = delivery.deliveryOtp;
            trackingInfo.deliveryOtpExpires = delivery.deliveryOtpExpires;
        }

        return res.status(200).json({ tracking: trackingInfo });
    } catch (err) {
        logger.error(`Error tracking delivery (customer): ${err.message}`);
        return res.status(500).json({ error: 'Failed to fetch tracking information' });
    }
};

/** Admin: assign or override driver */
exports.adminAssignDelivery = async (req, res) => {
    try {
        const { deliveryId } = req.params;
        const { driverId, note } = req.body;
        if (!driverId) {
            return res.status(400).json({ error: 'driverId is required' });
        }
        const updated = await deliveryService.adminAssignDriver(deliveryId, driverId, note || 'Assigned by admin');
        return res.status(200).json({
            message: 'Driver assigned',
            delivery: updated,
        });
    } catch (err) {
        logger.error(`Admin assign: ${err.message}`);
        return res.status(400).json({ error: err.message || 'Failed to assign driver' });
    }
};

/** Report delay / failure / customer unavailable — driver, customer, or admin */
exports.reportDeliveryException = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { type, details } = req.body;
        const allowed = ['LATE_DELIVERY', 'CUSTOMER_UNAVAILABLE', 'ADDRESS_NOT_FOUND', 'DELIVERY_FAILED'];

        if (!type || !allowed.includes(type)) {
            return res.status(400).json({ error: `type must be one of: ${allowed.join(', ')}` });
        }

        const delivery = await Delivery.findOne({ orderId });
        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        const uid = req.user?.id || req.user?._id;
        const role = req.user?.role;
        const isAdmin = ['ADMIN', 'admin'].includes(role);
        const isCustomer = uid != null && String(delivery.customerId) === String(uid);
        let isDriver = false;
        if (['DRIVER', 'deliveryPerson'].includes(role) && uid) {
            const driver = await Driver.findOne({ userId: String(uid) });
            if (driver && delivery.driverId && driver._id.equals(delivery.driverId)) {
                isDriver = true;
            }
        }

        if (!isAdmin && !isCustomer && !isDriver) {
            return res.status(403).json({ error: 'Not allowed' });
        }

        delivery.exceptionType = type;
        delivery.exceptionDetails = details || '';

        if (type === 'DELIVERY_FAILED') {
            delivery.updateStatus('FAILED', details || 'Delivery failed');
            if (delivery.driverId) {
                const drv = await Driver.findById(delivery.driverId);
                if (drv) {
                    drv.isAvailable = true;
                    drv.status = 'AVAILABLE';
                    drv.currentDelivery = null;
                    await drv.save();
                }
            }
            try {
                const orderService = require('../services/orderService');
                await orderService.updateOrderStatus(delivery.orderId, 'CANCELLED');
            } catch (e) {
                logger.warn(`Order sync on failure: ${e.message}`);
            }
            await notifyUser(delivery.customerId, 'Delivery could not be completed', {
                orderId: delivery.orderId,
                details: details || '',
            });
        } else {
            await notifyUser(delivery.customerId, 'Update on your delivery', {
                orderId: delivery.orderId,
                type,
                message: details || 'We are working on your order.',
            });
            await notifyRestaurant(delivery.restaurantId, 'Delivery exception reported', {
                orderId: delivery.orderId,
                type,
                details: details || '',
            });
        }

        await delivery.save();
        return res.status(200).json({ message: 'Exception recorded', deliveryId: delivery._id });
    } catch (err) {
        logger.error(`reportDeliveryException: ${err.message}`);
        return res.status(500).json({ error: 'Failed to record exception' });
    }
};

// Calculate delivery fee - called by order-service/checkout before placing order
exports.calculateDeliveryFee = async (req, res) => {
  try {
    const { pickupLat, pickupLon, dropoffLat, dropoffLon, orderAmount } = req.body;
    const result = deliveryFeeService.calculateFee({
      pickupLat: parseFloat(pickupLat),
      pickupLon: parseFloat(pickupLon),
      dropoffLat: parseFloat(dropoffLat),
      dropoffLon: parseFloat(dropoffLon),
      orderAmount: parseFloat(orderAmount) || 0
    });
    return res.status(200).json(result);
  } catch (err) {
    logger.error('Calculate fee error:', err);
    res.status(500).json({ success: false, error: 'Failed to calculate delivery fee' });
  }
};

// Cancel delivery by order ID - called by order-service when order is cancelled
exports.cancelByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const delivery = await Delivery.findOne({ orderId });
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found for this order' });
    }
    if (['DELIVERED', 'CANCELLED', 'FAILED'].includes(delivery.status)) {
      return res.status(400).json({ error: `Delivery already in ${delivery.status} state` });
    }
    delivery.updateStatus('CANCELLED', 'Order cancelled by customer or restaurant');
    await delivery.save();

    if (delivery.driverId) {
      const driver = await Driver.findById(delivery.driverId);
      if (driver) {
        driver.isAvailable = true;
        driver.status = 'AVAILABLE';
        driver.currentDelivery = null;
        await driver.save();
      }
    }

    await notifyRestaurant(delivery.restaurantId, 'Delivery cancelled', { orderId });
    await notifyUser(delivery.customerId, 'Your delivery has been cancelled', { orderId });
    logger.info(`Delivery cancelled by order ${orderId}`);
    return res.status(200).json({ message: 'Delivery cancelled', deliveryId: delivery._id });
  } catch (err) {
    logger.error('Cancel by order error:', err);
    res.status(500).json({ error: 'Failed to cancel delivery' });
  }
};

// Get all deliveries (admin only)
exports.getAllDeliveries = async (req, res) => {
    try {
        // This should be protected with admin authorization
        const { status, limit = 20, page = 1 } = req.query;
        const skip = (page - 1) * parseInt(limit);

        const query = {};
        if (status) {
            query.status = status;
        }

        let deliveries = await Delivery.find(query)
            .populate('driverId', 'name phone');
        // Cosmos Mongo may reject ORDER BY on excluded index paths.
        deliveries = deliveries
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(skip, skip + parseInt(limit));

        const total = await Delivery.countDocuments(query);

        return res.status(200).json({
            deliveries,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        logger.error(`Error fetching all deliveries: ${err.message}`);
        return res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
};

// Get available deliveries (CONFIRMED, no driver - for drivers to accept)
exports.getAvailableDeliveries = async (req, res) => {
    try {
        let deliveries = await Delivery.find({
            status: 'CONFIRMED',
            driverId: null,
        })
            .limit(50)
            .lean();
        deliveries = deliveries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        return res.status(200).json({ deliveries });
    } catch (err) {
        logger.error(`Error fetching available deliveries: ${err.message}`);
        return res.status(500).json({ error: 'Failed to fetch available deliveries' });
    }
};

// Cancel delivery
exports.cancelDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const delivery = await Delivery.findById(id);
        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        if (['DELIVERED', 'CANCELLED', 'FAILED'].includes(delivery.status)) {
            return res.status(400).json({
                error: `Cannot cancel delivery in ${delivery.status} state`
            });
        }

        // Update status to CANCELLED
        delivery.updateStatus('CANCELLED', reason || 'Delivery cancelled');
        await delivery.save();

        // If driver was assigned, update driver status
        if (delivery.driverId) {
            const driver = await Driver.findById(delivery.driverId);
            if (driver) {
                driver.isAvailable = true;
                driver.status = 'AVAILABLE';
                driver.currentDelivery = null;
                await driver.save();
            }
        }

        // Notify restaurant and customer
        await notifyRestaurant(delivery.restaurantId, 'Delivery cancelled', {
            orderId: delivery.orderId,
            reason: reason || 'No reason provided'
        });

        await notifyUser(delivery.customerId, 'Your delivery has been cancelled', {
            orderId: delivery.orderId,
            reason: reason || 'No reason provided'
        });

        logger.info(`Delivery ${id} cancelled: ${reason || 'No reason provided'}`);

        return res.status(200).json({
            message: 'Delivery cancelled successfully',
            deliveryId: delivery._id
        });
    } catch (err) {
        logger.error(`Error cancelling delivery: ${err.message}`);
        return res.status(500).json({ error: 'Failed to cancel delivery' });
    }
};

// Rate delivery
exports.rateDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, feedback } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const delivery = await Delivery.findById(id);
        if (!delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }

        if (delivery.status !== 'DELIVERED') {
            return res.status(400).json({ error: 'Can only rate completed deliveries' });
        }

        // Update delivery rating
        delivery.rating = rating;
        delivery.feedback = feedback || '';
        await delivery.save();

        // Update driver rating
        if (delivery.driverId) {
            const driver = await Driver.findById(delivery.driverId);
            if (driver) {
                // Calculate new average rating
                const totalRatings = driver.totalDeliveries;
                const currentTotalPoints = driver.rating * totalRatings;
                driver.rating = (currentTotalPoints + rating) / (totalRatings + 1);
                await driver.save();
            }
        }

        logger.info(`Delivery ${id} rated: ${rating}/5`);

        return res.status(200).json({
            message: 'Delivery rated successfully',
            deliveryId: delivery._id,
            rating: delivery.rating
        });
    } catch (err) {
        logger.error(`Error rating delivery: ${err.message}`);
        return res.status(500).json({ error: 'Failed to rate delivery' });
    }
};