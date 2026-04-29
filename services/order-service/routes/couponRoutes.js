const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', async (req, res) => {
  try {
    // Cosmos Mongo may reject ORDER BY on excluded index paths.
    // Fetch first, then sort in-memory to keep endpoint stable.
    const coupons = await Coupon.find().lean();
    coupons.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxDiscount, validUntil, usageLimit } = req.body;
    if (!code || !discountType || discountValue == null || !validUntil) {
      return res.status(400).json({ success: false, message: 'code, discountType, discountValue, validUntil required' });
    }
    const coupon = new Coupon({
      code: code.trim().toUpperCase(),
      discountType: discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
      discountValue: Number(discountValue),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      maxDiscount: maxDiscount != null ? Number(maxDiscount) : null,
      validUntil: new Date(validUntil),
      usageLimit: usageLimit != null ? Number(usageLimit) : null,
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
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
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
