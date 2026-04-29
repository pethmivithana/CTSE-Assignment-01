// File: models/Delivery.js
const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  restaurantId: {
    type: String,
    required: true
  },
  customerId: {
    type: String,
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  orderDetails: {
    items: [{
      name: String,
      quantity: Number,
      price: Number
    }],
    totalAmount: Number
  },
  paymentMethod: {
    type: String,
    enum: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH_ON_DELIVERY', 'ONLINE_PAYMENT'],
    default: 'CASH_ON_DELIVERY'
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  codAmountDue: {
    type: Number,
    default: 0
  },
  paymentCollectedAt: {
    type: Date,
    default: null
  },
  pickupLocation: {
    address: {
      type: String,
      required: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  dropoffLocation: {
    address: {
      type: String,
      required: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  status: {
    type: String,
    enum: [
      'PENDING', // Awaiting confirmation
      'CONFIRMED', // Restaurant confirmed, looking for driver (Rider accepted flow starts)
      'DRIVER_ASSIGNED', // Rider accepted
      'PICKED_UP', // Picked up from restaurant
      'ON_THE_WAY', // En route to customer
      'DELIVERED', // Delivered
      'CANCELLED',
      'FAILED'
    ],
    default: 'CONFIRMED'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'DRIVER_ASSIGNED',
        'PICKED_UP',
        'ON_THE_WAY',
        'DELIVERED',
        'CANCELLED',
        'FAILED'
      ]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      default: ''
    }
  }],
  estimatedDeliveryTime: {
    type: Date,
    default: null
  },
  actualDeliveryTime: {
    type: Date,
    default: null
  },
  rejectedBy: [{
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    },
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  deliveryAttempts: {
    type: Number,
    default: 0
  },
  distance: {
    type: Number, // in km
    default: 0
  },
  deliveryNotes: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: null
  },
  feedback: {
    type: String,
    default: ''
  },
  deliveryFee: { type: Number, default: 0 },
  driverLocationHistory: [{
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  exceptionType: {
    type: String,
    enum: ['', 'NO_DRIVER_AVAILABLE', 'CUSTOMER_UNAVAILABLE', 'ADDRESS_NOT_FOUND', 'LATE_DELIVERY', 'DELIVERY_FAILED'],
    default: ''
  },
  exceptionDetails: { type: String },
  lastReassignAttempt: { type: Date },
  /** OSRM GeoJSON LineString for map */
  routeGeometry: { type: mongoose.Schema.Types.Mixed, default: null },
  routeDurationMinutes: { type: Number, default: null },
  /** Live ETA updated when driver moves */
  currentEta: { type: Date, default: null },
  /** Proof of delivery — OTP shown to customer */
  deliveryOtp: { type: String, default: null },
  deliveryOtpExpires: { type: Date, default: null },
  podPhotoUrl: { type: String, default: '' },
  podVerifiedAt: { type: Date, default: null },
  /** Optional batch id for multi-drop (advanced) */
  batchId: { type: String, default: null },
}, { timestamps: true });

// Method to update status with history tracking
DeliverySchema.methods.updateStatus = function(newStatus, note = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: Date.now(),
    note: note
  });
  
  // Update timestamps for specific statuses
  if (newStatus === 'DELIVERED') {
    this.actualDeliveryTime = Date.now();
  }
  
  return this;
};

// Calculate estimated delivery time
DeliverySchema.methods.calculateEstimatedDeliveryTime = function() {
  let estimatedMinutes = 12; // prep buffer
  if (this.routeDurationMinutes != null && this.routeDurationMinutes > 0) {
    estimatedMinutes += Math.round(this.routeDurationMinutes);
  } else {
    estimatedMinutes += (this.distance || 0) * 2.5;
  }
  estimatedMinutes += 4; // buffer
  const estimatedTime = new Date();
  estimatedTime.setMinutes(estimatedTime.getMinutes() + estimatedMinutes);
  this.estimatedDeliveryTime = estimatedTime;
  this.currentEta = estimatedTime;
  return this;
};

// Index for faster queries (orderId already indexed via unique: true)
DeliverySchema.index({ status: 1 });
DeliverySchema.index({ driverId: 1 });

module.exports = mongoose.model('Delivery', DeliverySchema);