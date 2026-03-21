const mongoose = require('mongoose');

const pushDeviceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    token: { type: String, required: true },
    platform: { type: String, enum: ['web', 'android', 'ios'], default: 'web' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

pushDeviceSchema.index({ userId: 1, token: 1 }, { unique: true });

module.exports = mongoose.model('PushDevice', pushDeviceSchema);
