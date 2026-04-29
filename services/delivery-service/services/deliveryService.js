const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const logger = require('../utils/logger');
const routeService = require('./routeService');
const { notifyUser, notifyRestaurant, notifyDriver } = require('./notificationService');

const AUTO_ASSIGN = process.env.AUTO_ASSIGN_DELIVERY === 'true';

/**
 * Enrich delivery with OSRM route + ETA
 */
async function enrichDeliveryRoute(delivery) {
  try {
    const route = await routeService.getRoutePickupToDropoff(
      delivery.pickupLocation,
      delivery.dropoffLocation,
    );
    if (route) {
      delivery.routeGeometry = route.geometry;
      delivery.routeDurationMinutes = route.durationMinutes;
      if (route.distanceKm > 0) delivery.distance = route.distanceKm;
    }
  } catch (e) {
    logger.warn(`Route enrich failed: ${e.message}`);
  }
  delivery.calculateEstimatedDeliveryTime();
}

/**
 * Core assignment — used by accept + auto-assign + admin
 * @param {{ bypassAvailabilityCheck?: boolean }} [options] - When true (manual accept / admin), skip "Go Online" requirement; still block if driver has an active delivery.
 */
exports.assignDriverToDelivery = async (deliveryId, driverId, note = 'Driver assigned', options = {}) => {
  const { bypassAvailabilityCheck = false } = options;
  const delivery = await Delivery.findById(deliveryId);
  const driver = await Driver.findById(driverId);
  if (!delivery || !driver) {
    throw new Error('Delivery or driver not found');
  }
  if (!['CONFIRMED'].includes(delivery.status)) {
    throw new Error(`Cannot assign delivery in status ${delivery.status}`);
  }
  if (delivery.driverId) {
    throw new Error('Delivery already has a driver');
  }
  if (!driver.isVerified) {
    throw new Error('Driver not verified');
  }
  if (!bypassAvailabilityCheck) {
    if (!driver.isAvailable || driver.status !== 'AVAILABLE') {
      throw new Error('Driver not available');
    }
  } else if (driver.currentDelivery) {
    const other = await Delivery.findById(driver.currentDelivery);
    if (other && ['DRIVER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(other.status)) {
      throw new Error('Finish your current delivery before accepting another');
    }
  }

  await enrichDeliveryRoute(delivery);
  delivery.driverId = driver._id;
  delivery.updateStatus('DRIVER_ASSIGNED', note);
  await delivery.save();

  driver.isAvailable = false;
  driver.status = 'ON_DELIVERY';
  driver.currentDelivery = delivery._id;
  await driver.save();

  await notifyRestaurant(delivery.restaurantId, 'Driver assigned to order', {
    orderId: delivery.orderId,
    deliveryId: delivery._id,
    driverName: driver.name,
    driverPhone: driver.phone,
  });

  await notifyUser(delivery.customerId, 'Driver assigned to your order', {
    orderId: delivery.orderId,
    deliveryId: delivery._id,
    driverName: driver.name,
    estimatedDeliveryTime: delivery.estimatedDeliveryTime,
  });

  logger.info(`Assigned driver ${driverId} to delivery ${deliveryId}`);
  return delivery;
};

/**
 * Admin override: assign or reassign driver (only before pickup).
 * Frees previous driver if any, resets to CONFIRMED, then assigns.
 */
exports.adminAssignDriver = async (deliveryId, newDriverId, note = 'Assigned by admin') => {
  const delivery = await Delivery.findById(deliveryId);
  const newDriver = await Driver.findById(newDriverId);
  if (!delivery || !newDriver) {
    throw new Error('Delivery or driver not found');
  }
  if (['PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED', 'FAILED'].includes(delivery.status)) {
    throw new Error(`Cannot reassign delivery in status ${delivery.status}`);
  }

  if (delivery.driverId) {
    const prev = await Driver.findById(delivery.driverId);
    if (prev) {
      prev.isAvailable = true;
      prev.status = 'AVAILABLE';
      prev.currentDelivery = null;
      await prev.save();
    }
    delivery.driverId = null;
    delivery.updateStatus('CONFIRMED', 'Released for admin reassignment');
    await delivery.save();
  }

  if (delivery.status !== 'CONFIRMED') {
    throw new Error(`Unexpected delivery state ${delivery.status}`);
  }

  await exports.assignDriverToDelivery(deliveryId, newDriverId, note, { bypassAvailabilityCheck: true });
  return Delivery.findById(deliveryId).populate('driverId', 'name phone vehicleDetails');
};

// Assign delivery to nearest available driver
exports.assignDeliveryToDriver = async (deliveryId) => {
  try {
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery || delivery.status !== 'CONFIRMED' || delivery.driverId) {
      logger.error(`Cannot assign delivery ${deliveryId}: Invalid status or already assigned`);
      return false;
    }

    const availableDrivers = await Driver.find({
      isAvailable: true,
      isVerified: true,
      status: 'AVAILABLE',
    });

    if (availableDrivers.length === 0) {
      logger.warn(`No available drivers for delivery ${deliveryId}`);
      return false;
    }

    const rejectedDriverIds = (delivery.rejectedBy || []).map((item) => item.driverId.toString());
    const eligibleDrivers = availableDrivers.filter((driver) => !rejectedDriverIds.includes(driver._id.toString()));

    if (eligibleDrivers.length === 0) {
      logger.warn(`No eligible drivers for delivery ${deliveryId}`);
      return false;
    }

    const driversWithDistance = eligibleDrivers.map((driver) => {
      const distance = driver.calculateDistance(
        delivery.pickupLocation.latitude,
        delivery.pickupLocation.longitude,
      );
      return { driver, distance };
    });

    driversWithDistance.sort((a, b) => a.distance - b.distance);
    const closestDriver = driversWithDistance[0].driver;

    if (AUTO_ASSIGN) {
      try {
        await exports.assignDriverToDelivery(deliveryId, closestDriver._id, 'Auto-assigned to nearest driver');
        return true;
      } catch (e) {
        logger.error(`Auto-assign failed: ${e.message}`);
        return false;
      }
    }

    await notifyDriver(closestDriver._id, 'New delivery request', {
      deliveryId: delivery._id,
      orderId: delivery.orderId,
      pickupLocation: delivery.pickupLocation,
      dropoffLocation: delivery.dropoffLocation,
      distance: delivery.distance,
    });

    logger.info(`Notified driver ${closestDriver._id} about delivery ${deliveryId} (notify-only mode)`);
    return true;
  } catch (err) {
    logger.error(`Error assigning delivery to driver: ${err.message}`);
    return false;
  }
};

exports.reassignDelivery = async (deliveryId) => {
  try {
    const result = await exports.assignDeliveryToDriver(deliveryId);

    if (!result) {
      const delivery = await Delivery.findById(deliveryId);
      if (delivery && delivery.status === 'CONFIRMED') {
        if (delivery.deliveryAttempts >= 5) {
          const { notifyRestaurant } = require('./notificationService');
          await notifyRestaurant(delivery.restaurantId, 'Driver shortage alert', {
            orderId: delivery.orderId,
            message: 'We are experiencing difficulty finding a driver. Please prepare for potential delay.',
          });

          await notifyUser(delivery.customerId, 'Delivery delay notification', {
            orderId: delivery.orderId,
            message: 'We are currently experiencing high demand and working on assigning a driver to your order. Thank you for your patience.',
          });
        }

        setTimeout(() => {
          exports.reassignDelivery(deliveryId);
        }, 60000);
      }
    }

    return result;
  } catch (err) {
    logger.error(`Error reassigning delivery: ${err.message}`);
    return false;
  }
};

exports.getNearbyDrivers = async (latitude, longitude, maxDistance = 5) => {
  try {
    const availableDrivers = await Driver.find({
      isAvailable: true,
      isVerified: true,
      status: 'AVAILABLE',
      'currentLocation.latitude': { $ne: null },
      'currentLocation.longitude': { $ne: null },
    });

    const driversWithDistance = availableDrivers.map((driver) => {
      const distance = driver.calculateDistance(latitude, longitude);
      return { driver, distance };
    });

    return driversWithDistance
      .filter((item) => item.distance <= maxDistance && Number.isFinite(item.distance))
      .sort((a, b) => a.distance - b.distance)
      .map((item) => ({
        id: item.driver._id,
        name: item.driver.name,
        distance: item.distance,
        location: item.driver.currentLocation,
      }));
  } catch (err) {
    logger.error(`Error finding nearby drivers: ${err.message}`);
    return [];
  }
};

exports.processPendingDeliveries = async () => {
  try {
    let pendingDeliveries = await Delivery.find({
      status: 'CONFIRMED',
      driverId: null,
    });
    // Cosmos Mongo may reject ORDER BY on excluded index paths.
    // Keep deterministic processing by sorting in-memory.
    pendingDeliveries = pendingDeliveries.sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
    );

    logger.info(`Processing ${pendingDeliveries.length} pending deliveries`);

    for (const delivery of pendingDeliveries) {
      await exports.assignDeliveryToDriver(delivery._id);
    }
  } catch (err) {
    logger.error(`Error processing pending deliveries: ${err.message}`);
  }
};

exports.enrichDeliveryRoute = enrichDeliveryRoute;
