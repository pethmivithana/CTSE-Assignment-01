const Review = require('../models/ReviewEntry');
const Restaurant = require('../models/Restaurant');
const mongoose = require('mongoose');

/**
 * GET /api/restaurants/:id/reviews - list reviews for a restaurant (public)
 */
exports.getRestaurantReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid restaurant ID' });
    }
    // Cosmos Mongo may reject ORDER BY on excluded index paths.
    // Fetch first, then sort in memory to avoid 400s.
    let reviews = await Review.find({ restaurantId: id }).limit(50).lean();
    reviews = reviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(reviews);
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/restaurants/:id/reviews - create review (auth, customer)
 * Customers can post multiple reviews over time.
 * If orderId is provided, only one review per order is allowed.
 */
exports.createOrUpdateReview = async (req, res) => {
  try {
    const { id: restaurantId } = req.params;
    const { rating, comment, orderId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ error: 'Invalid restaurant ID' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const customerId = req.user._id?.toString?.() || req.user.id;
    const customerName = req.user.fullName || req.user.name || 'Customer';

    const reviewData = {
      restaurantId,
      customerId,
      customerName,
      rating: Number(rating),
      comment: (comment || '').trim().slice(0, 1000),
      orderId: orderId && mongoose.Types.ObjectId.isValid(orderId) ? orderId : null,
    };

    if (reviewData.orderId) {
      const alreadyReviewedOrder = await Review.findOne({
        restaurantId,
        customerId,
        orderId: reviewData.orderId,
      }).lean();
      if (alreadyReviewedOrder) {
        return res.status(409).json({ error: 'You have already reviewed this order' });
      }
    }
    const review = new Review(reviewData);
    await review.save();

    await updateRestaurantRating(restaurantId);

    res.status(201).json(review);
  } catch (err) {
    console.error('Create/update review error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/restaurants/admin/reviews - list reviews across all restaurants (admin)
 */
exports.getAdminRestaurantReviews = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    let reviews = await Review.find({})
      .populate('restaurantId', 'name')
      .limit(200)
      .lean();
    reviews = reviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const items = reviews.map((r) => ({
      _id: r._id,
      restaurantId: r.restaurantId?._id || r.restaurantId,
      restaurantName: r.restaurantId?.name || 'Restaurant',
      customerName: r.customerName || 'Customer',
      rating: r.rating,
      comment: r.comment || '',
      createdAt: r.createdAt,
      orderId: r.orderId || null,
    }));
    return res.json({
      items,
      summary: {
        totalRatings: items.length,
        averageRating: items.length
          ? Number((items.reduce((s, i) => s + Number(i.rating || 0), 0) / items.length).toFixed(2))
          : 0,
      },
    });
  } catch (err) {
    console.error('Get admin reviews error:', err);
    res.status(500).json({ error: err.message });
  }
};

async function updateRestaurantRating(restaurantId) {
  try {
    const agg = await Review.aggregate([
      { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const result = agg[0];
    const avgRating = result ? Math.round(result.avg * 10) / 10 : 0;
    await Restaurant.findByIdAndUpdate(restaurantId, { $set: { rating: avgRating } });
  } catch (err) {
    console.warn('Failed to update restaurant rating:', err.message);
  }
}
