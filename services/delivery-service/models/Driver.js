const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    lastUpdated: {
      type: Date,
      default: null
    }
  },
  rating: {
    type: Number,
    default: 0
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  currentDelivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    default: null
  },
  status: {
    type: String,
    enum: ['OFFLINE', 'AVAILABLE', 'BUSY', 'ON_DELIVERY'],
    default: 'OFFLINE'
  },
  vehicleType: {
    type: String,
    enum: ['BICYCLE', 'MOTORCYCLE', 'CAR', 'VAN'],
    required: true
  },
  vehicleDetails: {
    model: String,
    licensePlate: String,
    color: String,
  },
  /** Driver's license (synced from user onboarding or updated here) */
  licenseNumber: { type: String, default: '' },
  licenseDocumentUrl: { type: String, default: '' },
  licenseExpiry: { type: Date, default: null },
  documentsVerified: { type: Boolean, default: false },
  lastActiveAt: { type: Date, default: null },
  maxConcurrentDeliveries: { type: Number, default: 1 }
}, { timestamps: true });

// Calculate distance between driver and a location
DriverSchema.methods.calculateDistance = function(targetLat, targetLon) {
  if (
    this.currentLocation == null ||
    this.currentLocation.latitude == null ||
    this.currentLocation.longitude == null
  ) {
    return Number.POSITIVE_INFINITY;
  }
  // Using Haversine formula to calculate distance
  const R = 6371; // Earth radius in km
  const dLat = (targetLat - this.currentLocation.latitude) * Math.PI / 180;
  const dLon = (targetLon - this.currentLocation.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.currentLocation.latitude * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// Index for geospatial queries
DriverSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });

module.exports = mongoose.model('Driver', DriverSchema);