const User = require("../models/UserModel");
const PendingRegistration = require("../models/PendingRegistrationModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendPasswordResetOTP, sendOTPEmail } = require("../utils/emailService");

// Register Controller
/**
 * Register with OTP - Step 1: Request OTP (email or phone)
 * POST /auth/register/request-otp
 */
exports.registerRequestOTP = async (req, res) => {
  try {
    const { email, contactNumber } = req.body;
    if (!email && !contactNumber) {
      return res.status(400).json({ status: false, message: "Email or phone is required" });
    }
    if (email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ status: false, message: "Email already in use" });
      }
    }
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await PendingRegistration.deleteMany({ $or: [{ email }, { phone: contactNumber }] });
    await PendingRegistration.create({
      email: email || "",
      phone: contactNumber || "",
      otp,
      otpExpiry,
    });
    if (email) {
      await sendOTPEmail(email, "User", otp);
    }
    if (contactNumber && !email) {
      console.log("[Dev] Phone OTP:", contactNumber, "->", otp);
    }
    res.status(200).json({
      status: true,
      message: "OTP sent. Valid for 10 minutes.",
      expiresIn: 600,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/**
 * Register with OTP - Step 2: Verify OTP and create account
 * POST /auth/register/verify-otp
 */
exports.registerVerifyOTP = async (req, res) => {
  try {
    const {
      email,
      phone,
      otp,
      fullName,
      password,
      contactNumber,
      role,
      restaurantName,
      restaurantAddress,
      vehicleType,
      vehicleModel,
      licensePlate,
      driverLicense,
      nicNumber,
    } = req.body;

    if (!otp || (!email && !phone)) {
      return res.status(400).json({ status: false, message: "OTP and email or phone required" });
    }
    if (!fullName || !password || !contactNumber) {
      return res.status(400).json({ status: false, message: "fullName, password, contactNumber required" });
    }

    const pending = await PendingRegistration.findOne({
      $or: [{ email: email || "" }, { phone: phone || contactNumber || "" }],
      otp,
    });
    if (!pending || !pending.otpExpiry || new Date() > pending.otpExpiry) {
      return res.status(400).json({ status: false, message: "Invalid or expired OTP" });
    }

    const useEmail = email || pending.email;
    if (useEmail) {
      const existing = await User.findOne({ email: useEmail });
      if (existing) {
        await PendingRegistration.deleteOne({ _id: pending._id });
        return res.status(400).json({ status: false, message: "Email already in use" });
      }
    }

    if (role === "restaurantManager" && (!restaurantName || !restaurantAddress)) {
      return res.status(400).json({ status: false, message: "Restaurant name and address required" });
    }
    if (role === "deliveryPerson" && (!vehicleType || !vehicleModel || !licensePlate || !driverLicense || !nicNumber)) {
      return res.status(400).json({ status: false, message: "Driver info required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isApproved = role === "customer";
    const userData = {
      fullName,
      email: useEmail || `user_${Date.now()}@feedo.local`,
      password: hashedPassword,
      contactNumber,
      role: role || "customer",
      isApproved,
      isVerified: true,
    };
    if (role === "restaurantManager") {
      userData.restaurantInfo = {
        id: (restaurantName || "").toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 10) + Math.floor(1000 + Math.random() * 9000),
        name: restaurantName,
        address: restaurantAddress,
      };
    }
    if (role === "deliveryPerson") {
      userData.driverProfile = {
        vehicleType,
        vehicleDetails: { model: vehicleModel, licensePlate },
        driverLicense,
        nicNumber,
      };
    }

    const user = new User(userData);
    await user.save();
    await PendingRegistration.deleteOne({ _id: pending._id });

    const { password: _, ...userResponse } = user.toObject();
    res.status(201).json({
      status: true,
      message: "Registration verified and account created successfully!",
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { 
      fullName, 
      email, 
      password, 
      contactNumber, 
      role, 
      restaurantName, 
      restaurantAddress,
      vehicleType, 
      vehicleModel, 
      licensePlate,
      driverLicense,
      nicNumber
    } = req.body;

    // Disallow admin registration through this route
    if (role === "admin") {
      return res.status(403).json({ 
        status: false, 
        message: "Admin registration is not allowed through this route" 
      });
    }

    // Check if restaurant manager is providing restaurant details
    if (role === "restaurantManager") {
      if (!restaurantName || !restaurantAddress) {
        return res.status(400).json({ 
          status: false, 
          message: "Restaurant name and address are required for restaurant managers" 
        });
      }
    }

    // Validation for delivery persons (drivers)
    if (role === "deliveryPerson") {
      if (!vehicleType || !vehicleModel || !licensePlate || !driverLicense || !nicNumber) {
        return res.status(400).json({
          status: false,
          message: "All driver information is required for delivery personnel"
        });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        status: false, 
        message: "Email already in use" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let isApproved = false;
    // Customers are automatically approved
    if (role === "customer") {
      isApproved = true;
    }

    const userData = {
      fullName,
      email,
      password: hashedPassword,
      contactNumber,
      role,
      isApproved
    };

    // Add restaurant information if role is restaurant manager
    if (role === "restaurantManager") {
      // Generate a unique restaurant ID
      const restaurantId = generateRestaurantId(restaurantName);
      
      userData.restaurantInfo = {
        id: restaurantId,  // Add the generated ID
        name: restaurantName,
        address: restaurantAddress
      };
    }

    // Add driver information if role is delivery person
    if (role === "deliveryPerson") {
      userData.driverProfile = {
        vehicleType,
        vehicleDetails: {
          model: vehicleModel,
          licensePlate
        },
        driverLicense,
        nicNumber
      };
    }

    const user = new User(userData);
    const savedUser = await user.save();

    const { password: _, ...userResponse } = savedUser.toObject();

    res.status(201).json({
      status: true,
      message: "User registered successfully! Please verify your email. Awaiting approval if required.",
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({ 
      status: false, 
      message: error.message 
    });
  }
};

// Helper function to generate restaurant ID
function generateRestaurantId(restaurantName) {
  // Clean the restaurant name (remove special characters and spaces)
  const cleanName = restaurantName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);  // Take first 10 characters
    
  // Generate a random 4-digit number
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  
  // Combine to create the ID (e.g., "mcdonalds1234")
  return `${cleanName}${randomNum}`;
}

// Login Controller (with rate limiting, lockout, session tracking)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userAgent = req.headers["user-agent"] || "";
    const ip = req.ip || req.connection?.remoteAddress || "unknown";

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        message: "No account found with this email. Please create an account or check your email." 
      });
    }

    if (user.isDeactivated) {
      return res.status(403).json({ message: "Account is deactivated. Please contact support to reactivate." });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(429).json({
        message: `Account temporarily locked. Try again after ${Math.ceil((user.lockUntil - Date.now()) / 60000)} minutes.`,
      });
    }

    if ((user.role === "restaurantManager" || user.role === "deliveryPerson") && !user.isApproved) {
      return res.status(403).json({ message: "Account not yet approved by Admin" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ 
        message: "Incorrect password. Please try again." 
      });
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user._id, type: "refresh" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(-5);

    if (!user.sessions) user.sessions = [];
    user.sessions.push({
      refreshToken,
      deviceInfo: userAgent.substring(0, 200),
      ip,
      userAgent: userAgent.substring(0, 500),
    });
    if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);

    await user.save({ validateBeforeSave: false });

    const { password: _, ...userData } = user.toObject();
    res.json({
      status: true,
      token: accessToken,
      refreshToken,
      expiresIn: 900,
      user: userData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Refresh access token
 * POST /auth/refresh
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: false,
        message: "Refresh token is required",
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== "refresh") {
      return res.status(401).json({
        status: false,
        message: "Invalid refresh token",
      });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens?.includes(refreshToken)) {
      return res.status(401).json({
        status: false,
        message: "Refresh token invalid or expired",
      });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      status: true,
      token: accessToken,
      expiresIn: 900,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: false,
        message: "Refresh token expired",
      });
    }
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Logout - invalidate refresh tokens
 * POST /auth/logout
 */
exports.logout = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.user?._id;
    const { refreshToken } = req.body || {};
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        if (refreshToken && user.refreshTokens?.includes(refreshToken)) {
          user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
          user.sessions = user.sessions?.filter((s) => s.refreshToken !== refreshToken) || [];
        } else {
          user.refreshTokens = [];
          user.sessions = [];
        }
        await user.save({ validateBeforeSave: false });
      }
    }
    res.json({
      status: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(400).json({ 
        status: false, 
        message: 'User ID not provided in request' 
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        status: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      status: true, 
      user 
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      status: false, 
      message: error.message 
    });
  }
};

/**
 * Request password reset OTP - sends OTP to user's email
 * POST /auth/forgot-password
 */
exports.requestPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "No account found with this email.",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = expiry;
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetOTP(user.email, user.fullName || "User", otp);

    res.json({
      status: true,
      message: "OTP sent to your email. Please check your inbox.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Failed to send OTP",
    });
  }
};

/**
 * Reset password with OTP verification
 * POST /auth/reset-password
 */
exports.resetPasswordWithOTP = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: false,
        message: "Email, OTP, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: false,
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "No account found with this email.",
      });
    }

    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({
        status: false,
        message: "Invalid or expired OTP.",
      });
    }

    if (!user.resetPasswordOTPExpiry || new Date() > user.resetPasswordOTPExpiry) {
      return res.status(400).json({
        status: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;
    await user.save();

    res.json({
      status: true,
      message: "Password updated successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Failed to reset password",
    });
  }
};

/**
 * Change password (authenticated user - must know current password)
 * PUT /auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.user?._id?.toString();
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      status: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Failed to change password",
    });
  }
};