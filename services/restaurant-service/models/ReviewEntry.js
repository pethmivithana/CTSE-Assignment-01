const mongoose = require('mongoose');

const reviewEntrySchema = new mongoose.Schema({
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
}, { timestamps: true, collection: 'review_entries' });

// If orderId is provided, enforce one review per order by same customer.
reviewEntrySchema.index(
  { restaurantId: 1, customerId: 1, orderId: 1 },
  { unique: true, partialFilterExpression: { orderId: { $type: 'objectId' } } },
);

module.exports = mongoose.model('ReviewEntry', reviewEntrySchema);
