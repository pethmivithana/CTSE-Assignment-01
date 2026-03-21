const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOTPEmail } = require("../utils/emailService");

exports.requestReactivationOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: false, message: "Email is required" });
    }
    const user = await User.findOne({ email, isDeactivated: true });
    if (!user) {
      return res.status(404).json({ status: false, message: "No deactivated account found" });
    }
    const otp = crypto.randomInt(100000, 999999).toString();
    user.reactivationOTP = otp;
    user.reactivationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await sendOTPEmail(user.email, user.fullName, otp);
    res.status(200).json({
      status: true,
      message: "OTP sent to your email. Valid for 10 minutes.",
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.deactivateAccount = async (req, res) => {
  try {
    const { password, reason } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ status: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password || "", user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: "Password is required to deactivate account",
      });
    }

    user.isDeactivated = true;
    user.deactivatedAt = new Date();
    user.deactivationReason = reason || "User requested";
    user.refreshTokens = [];
    user.sessions = [];
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate account error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.reactivateAccount = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        status: false,
        message: "Email and OTP are required to reactivate",
      });
    }
    const user = await User.findOne({ email, isDeactivated: true });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "No deactivated account found with this email",
      });
    }
    if (user.reactivationOTP !== otp || !user.reactivationOTPExpiry || new Date() > user.reactivationOTPExpiry) {
      return res.status(400).json({
        status: false,
        message: "Invalid or expired OTP",
      });
    }
    if (newPassword && newPassword.length >= 6) {
      user.password = await bcrypt.hash(newPassword, 10);
    }
    user.isDeactivated = false;
    user.deactivatedAt = undefined;
    user.deactivationReason = undefined;
    user.reactivationOTP = undefined;
    user.reactivationOTPExpiry = undefined;
    await user.save({ validateBeforeSave: false });

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
    user.refreshTokens = [refreshToken];
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: true,
      message: "Account reactivated successfully",
      token: accessToken,
      refreshToken,
      expiresIn: 900,
      user: await User.findById(user._id).select("-password -refreshTokens").lean(),
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
