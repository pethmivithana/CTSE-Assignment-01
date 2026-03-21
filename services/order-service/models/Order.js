const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  specialInstructions: { type: String },
  size: { type: String },
  servings: { type: Number },
  imageUrl: { type: String },
});

/** Full lifecycle: CREATED → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED; CANCELLED */
const ORDER_STATUSES = [
  'CREATED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'DELIVERED',
  'CANCELLED',
  'PENDING',
  'ACCEPTED',
  'OUT_FOR_DELIVERY',
];

const orderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    items: [orderItemSchema],
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      additionalInfo: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    addressId: { type: mongoose.Schema.Types.ObjectId },
    contactPhone: { type: String, required: true },
    subtotal: { type: Number },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH_ON_DELIVERY', 'ONLINE_PAYMENT', 'PAYPAL', 'WALLET'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    paymentId: { type: String },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'CREATED',
    },
    deliveryId: { type: mongoose.Schema.Types.ObjectId },
    estimatedDeliveryTime: { type: Date },
    estimatedPreparationTime: { type: Number },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    couponCode: { type: String },
    discountAmount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    refundRequested: { type: Boolean, default: false },
    refundReason: { type: String },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

orderSchema.virtual('trackingUrl').get(function () {
  return `/track/${this._id}`;
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
