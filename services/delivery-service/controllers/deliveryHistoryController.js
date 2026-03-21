/**
 * Delivery History Controller
 * Stores and retrieves completed delivery records for customers, riders, and restaurants
 */
const Delivery = require('../models/Delivery');
const logger = require('../utils/logger');

exports.getCustomerHistory = async (req, res) => {
  try {
    const customerId = req.user?.id || req.user?._id || req.query.customerId;
    if (!customerId) {
      return res.status(400).json({ error: 'customerId required' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { customerId: String(customerId), status: 'DELIVERED' };
    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .sort({ actualDeliveryTime: -1 })
        .skip(skip)
        .limit(limit)
        .populate('driverId', 'name phone rating vehicleDetails')
        .lean(),
      Delivery.countDocuments(query)
    ]);

    return res.status(200).json({
      deliveries,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error('Customer delivery history error:', err);
    res.status(500).json({ error: 'Failed to fetch delivery history' });
  }
};

exports.getDriverHistory = async (req, res) => {
  try {
    const driverId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const query = { driverId, status: 'DELIVERED' };
    if (from) query.actualDeliveryTime = query.actualDeliveryTime || {};
    if (from) query.actualDeliveryTime.$gte = from;
    if (to) query.actualDeliveryTime = query.actualDeliveryTime || {};
    if (to) query.actualDeliveryTime.$lte = to;

    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .sort({ actualDeliveryTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Delivery.countDocuments(query)
    ]);

    return res.status(200).json({
      deliveries,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error('Driver delivery history error:', err);
    res.status(500).json({ error: 'Failed to fetch delivery history' });
  }
};
