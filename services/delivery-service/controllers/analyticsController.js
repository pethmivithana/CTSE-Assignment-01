/**
 * Performance & Analytics Controller
 * Tracks delivery metrics: delivery time, success rate, rider efficiency
 */
const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const logger = require('../utils/logger');

exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setMonth(monthStart.getMonth() - 1);

    const [
      totalDeliveries,
      deliveredToday,
      deliveredThisWeek,
      cancelledCount,
      failedCount,
      driversTotal,
      driversAvailable,
      avgDeliveryTime
    ] = await Promise.all([
      Delivery.countDocuments({ status: 'DELIVERED' }),
      Delivery.countDocuments({ status: 'DELIVERED', actualDeliveryTime: { $gte: todayStart } }),
      Delivery.countDocuments({ status: 'DELIVERED', actualDeliveryTime: { $gte: weekStart } }),
      Delivery.countDocuments({ status: 'CANCELLED' }),
      Delivery.countDocuments({ status: 'FAILED' }),
      Driver.countDocuments({ isVerified: true }),
      Driver.countDocuments({ isVerified: true, isAvailable: true, status: 'AVAILABLE' }),
      Delivery.aggregate([
        { $match: { status: 'DELIVERED', actualDeliveryTime: { $ne: null } } },
        {
          $addFields: {
            durationMs: { $subtract: ['$actualDeliveryTime', '$createdAt'] }
          }
        },
        { $match: { durationMs: { $gt: 0 } } },
        { $group: { _id: null, avgMs: { $avg: '$durationMs' } } },
        { $project: { avgMinutes: { $divide: ['$avgMs', 60000] } } }
      ])
    ]);

    const delivered = totalDeliveries + cancelledCount + failedCount;
    const successRate = delivered > 0
      ? Math.round((totalDeliveries / (delivered)) * 100)
      : 100;

    const driverStats = await Driver.aggregate([
      { $match: { isVerified: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalDeliveries: { $sum: '$totalDeliveries' }
        }
      }
    ]);

    return res.status(200).json({
      overview: {
        totalDeliveries,
        deliveredToday,
        deliveredThisWeek,
        cancelledCount,
        failedCount,
        successRate
      },
      drivers: {
        total: driversTotal,
        available: driversAvailable,
        avgRating: driverStats[0]?.avgRating ? Math.round(driverStats[0].avgRating * 10) / 10 : 0
      },
      performance: {
        avgDeliveryTimeMinutes: avgDeliveryTime[0]?.avgMinutes
          ? Math.round(avgDeliveryTime[0].avgMinutes)
          : null
      }
    });
  } catch (err) {
    logger.error('Analytics dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};
