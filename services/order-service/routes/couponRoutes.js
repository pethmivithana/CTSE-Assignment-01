const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { authMiddleware } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

router.use(authMiddleware);

const isAdmin = (req) => req.user?.role === 'admin';
const isRestaurantManager = (req) => req.user?.role === 'restaurantManager';
const canManageCoupons = (req) => isAdmin(req) || isRestaurantManager(req);
const managerRestaurantId = (req) => req.user?.restaurantInfo?._id || req.user?.restaurantInfo?.restaurantId;

router.get('/eligible', async (req, res) => {
  try {
    if (req.user?.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can view eligible coupons' });
    }
    const { restaurantId, orderTotal = 0 } = req.query;
    const now = new Date();
    const total = Number(orderTotal) || 0;
    const query = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      minOrderAmount: { $lte: total },
      $and: [
        { $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
        { $or: [{ restaurantId: null }, ...(restaurantId ? [{ restaurantId }] : [])] },
      ],
    };
    let coupons = await Coupon.find(query).lean();
    coupons = coupons.sort((a, b) => new Date(a.validUntil || 0) - new Date(b.validUntil || 0));
    return res.json({ success: true, data: coupons });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    if (!canManageCoupons(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const query = {};
    if (isRestaurantManager(req)) {
      const rid = managerRestaurantId(req);
      if (!rid) return res.status(400).json({ success: false, message: 'No restaurant linked to manager account' });
      query.restaurantId = rid;
    }
    // Cosmos Mongo may reject ORDER BY on excluded index paths.
    // Fetch first, then sort in-memory to keep endpoint stable.
    const coupons = await Coupon.find(query).lean();
    coupons.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!canManageCoupons(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { code, discountType, discountValue, minOrderAmount, maxDiscount, validUntil, usageLimit, restaurantId, title, description } = req.body;
    if (!code || !discountType || discountValue == null || !validUntil) {
      return res.status(400).json({ success: false, message: 'code, discountType, discountValue, validUntil required' });
    }
    let scopedRestaurantId = null;
    if (isRestaurantManager(req)) {
      const rid = managerRestaurantId(req);
      if (!rid) return res.status(400).json({ success: false, message: 'No restaurant linked to manager account' });
      scopedRestaurantId = rid;
    } else if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
      scopedRestaurantId = restaurantId;
    }

    const coupon = new Coupon({
      code: code.trim().toUpperCase(),
      discountType: discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
      discountValue: Number(discountValue),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      maxDiscount: maxDiscount != null ? Number(maxDiscount) : null,
      validUntil: new Date(validUntil),
      usageLimit: usageLimit != null ? Number(usageLimit) : null,
      title: title || '',
      description: description || '',
      createdByRole: isAdmin(req) ? 'admin' : 'restaurantManager',
      createdByUserId: String(req.user?._id || req.user?.id || ''),
      restaurantId: scopedRestaurantId,
    });
    await coupon.save();
    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    if (!canManageCoupons(req)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    const existing = await Coupon.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Coupon not found' });
    if (isRestaurantManager(req) && String(existing.restaurantId || '') !== String(managerRestaurantId(req) || '')) {
      return res.status(403).json({ success: false, message: 'You can edit only your restaurant coupons' });
    }
    const updates = {};
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: 'No valid updates' });
    const coupon = await Coupon.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
