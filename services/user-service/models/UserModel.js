const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home" },
  street: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  state: { type: String },
  country: { type: String, default: "Sri Lanka" },
  isDefault: { type: Boolean, default: false },
  additionalInfo: { type: String },
}, { _id: true });

const paymentPreferenceSchema = new mongoose.Schema({
  defaultPaymentMethod: { 
    type: String, 
    enum: ["CARD", "CASH", "BANK_TRANSFER", "WALLET", "COD"],
    default: "COD" 
  },
  savedCards: [{
    lastFour: { type: String },
    brand: { type: String },
    expiryMonth: { type: Number },
    expiryYear: { type: Number },
    isDefault: { type: Boolean, default: false },
  }],
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  refreshToken: { type: String, required: true },
  deviceInfo: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "restaurantManager", "customer", "deliveryPerson"],
    default: "customer"
  },
  // Restaurant information for restaurant managers
  restaurantInfo: {
    id: { type: String },
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
    name: { type: String },
    address: { type: String }
  },
  isApproved: {
    type: Boolean,
    default: function () {
      return this.role === "customer";
    }
  },
  // Account verification
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpiry: { type: Date },
  emailVerificationOTP: { type: String },
  emailVerificationOTPExpiry: { type: Date },
  resetPasswordOTP: { type: String },
  resetPasswordOTPExpiry: { type: Date },
  // Profile - addresses & contact
  profilePicture: { type: String },
  addresses: [addressSchema],
  paymentPreferences: { type: paymentPreferenceSchema, default: () => ({}) },
  // User activity tracking
  savedRestaurants: [{ restaurantId: { type: String }, name: { type: String }, addedAt: { type: Date, default: Date.now } }],
  favoriteFoods: [{ menuItemId: { type: String }, name: { type: String }, addedAt: { type: Date, default: Date.now } }],
  dietaryPreferences: {
    vegetarian: { type: Boolean, default: false },
    vegan: { type: Boolean, default: false },
    glutenFree: { type: Boolean, default: false },
    halal: { type: Boolean, default: false },
    kosher: { type: Boolean, default: false },
    allergies: [{ type: String }],
  },
  orderHistory: [{ type: mongoose.Schema.Types.Mixed }],
  // Account status
  isDeactivated: { type: Boolean, default: false },
  deactivatedAt: { type: Date },
  deactivationReason: { type: String },
  reactivationOTP: { type: String },
  reactivationOTPExpiry: { type: Date },
  // Login attempts (for rate limiting)
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  // Delivery Person Specific Fields
  driverProfile: {
    isVerified: { type: Boolean, default: false },
    vehicleType: {
      type: String,
      enum: ["BICYCLE", "MOTORCYCLE", "CAR", "VAN"],
      default: null
    },
    vehicleDetails: {
      model: { type: String },
      licensePlate: { type: String }
    },
    driverLicense: { type: String },
    nicNumber: { type: String }
  },
  // Session management - device/session tracking
  sessions: [sessionSchema],
  refreshTokens: [{ type: String }],
  // OAuth
  googleId: { type: String },
}, { timestamps: true });

// Index for faster lookups (email already has unique: true which creates index)
UserSchema.index({ "verificationToken": 1 });
UserSchema.index({ "emailVerificationOTP": 1 });

module.exports = mongoose.model("User", UserSchema);
