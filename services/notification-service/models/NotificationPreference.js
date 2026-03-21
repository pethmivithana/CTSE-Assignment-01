const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    paymentAlerts: { type: Boolean, default: true },
    deliveryAlerts: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
