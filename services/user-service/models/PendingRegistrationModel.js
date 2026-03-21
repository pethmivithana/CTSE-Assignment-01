const mongoose = require("mongoose");

const PendingRegistrationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  phone: { type: String },
  otp: { type: String, required: true },
  otpExpiry: { type: Date, required: true },
  registrationData: {
    fullName: { type: String },
    password: { type: String },
    contactNumber: { type: String },
    role: { type: String },
    restaurantName: { type: String },
    restaurantAddress: { type: String },
    vehicleType: { type: String },
    vehicleModel: { type: String },
    licensePlate: { type: String },
    driverLicense: { type: String },
    nicNumber: { type: String },
  },
}, { timestamps: true });

PendingRegistrationSchema.index({ email: 1 });
PendingRegistrationSchema.index({ otpExpiry: 1 }, { expireAfterSeconds: 0 }); // TTL: auto-delete expired

module.exports = mongoose.model("PendingRegistration", PendingRegistrationSchema);
