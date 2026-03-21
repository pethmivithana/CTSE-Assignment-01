const User = require("../models/UserModel");
const crypto = require("crypto");
const { sendVerificationEmail, sendOTPEmail } = require("../utils/emailService");

/**
 * Request OTP for email verification
 * POST /auth/verify/request-otp
 */
exports.requestOTP = async (req, res) => {
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
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        status: false,
        message: "Email is already verified",
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailVerificationOTP = otp;
    user.emailVerificationOTPExpiry = otpExpiry;
    await user.save({ validateBeforeSave: false });

    // Send OTP via email (or log in development)
    await sendOTPEmail(email, user.fullName, otp);

    res.status(200).json({
      status: true,
      message: "OTP sent to your email. Valid for 10 minutes.",
      expiresIn: 600, // seconds
    });
  } catch (error) {
    console.error("Request OTP error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Verify OTP and mark email as verified
 * POST /auth/verify/otp
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        status: false,
        message: "Email is already verified",
      });
    }

    if (user.emailVerificationOTP !== otp) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    if (!user.emailVerificationOTPExpiry || new Date() > user.emailVerificationOTPExpiry) {
      return res.status(400).json({
        status: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    user.isVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: true,
      message: "Email verified successfully",
      user: await User.findById(user._id).select("-password -emailVerificationOTP -emailVerificationOTPExpiry"),
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Resend verification email (link-based, optional)
 * POST /auth/verify/resend
 */
exports.resendVerification = async (req, res) => {
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
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        status: false,
        message: "Email is already verified",
      });
    }

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    user.emailVerificationOTP = otp;
    user.emailVerificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail(email, user.fullName, otp);

    res.status(200).json({
      status: true,
      message: "New OTP sent to your email",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
