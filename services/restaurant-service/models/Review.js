const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    default: '',
  },
}, { timestamps: true });

reviewSchema.index({ restaurantId: 1, customerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
