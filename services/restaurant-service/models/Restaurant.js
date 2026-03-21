const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  radius: { type: Number, required: true }, // in km
  deliveryFee: { type: Number, default: 0 }
});

const dayHoursSchema = new mongoose.Schema({
  open: { type: String },
  close: { type: String },
  closed: { type: Boolean, default: false }
}, { _id: false });

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String },
  description: { type: String },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: {
    address: { type: String, required: true },
    city: { type: String, default: '' },
    postalCode: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  deliveryRadius: { type: Number, default: 10 }, // km
  rating: { type: Number, default: 0, min: 0, max: 5 },
  contactInfo: {
    phone: { type: String, required: true },
    email: { type: String }
  },
  cuisineType: { type: String, default: 'General' },
  isVeg: { type: Boolean, default: false },
  isOpen: { type: Boolean, default: true },
  deliveryAvailable: { type: Boolean, default: true },
  deliveryZones: [deliveryZoneSchema],
  openingHours: {
    open: { type: String },
    close: { type: String },
    mon: dayHoursSchema,
    tue: dayHoursSchema,
    wed: dayHoursSchema,
    thu: dayHoursSchema,
    fri: dayHoursSchema,
    sat: dayHoursSchema,
    sun: dayHoursSchema
  }
}, { timestamps: true });

restaurantSchema.index({ cuisineType: 1 });
restaurantSchema.index({ managerId: 1 });
restaurantSchema.index({ isVeg: 1 });
restaurantSchema.index({ isOpen: 1, deliveryAvailable: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
