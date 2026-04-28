const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");

/**
 * Get full profile (addresses, payment prefs, saved restaurants, order history)
 * GET /users/profile/full
 */
exports.getFullProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -emailVerificationOTP -emailVerificationOTPExpiry -refreshTokens")
      .lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      status: true,
      user,
    });
  } catch (error) {
    console.error("Get full profile error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Update profile (fullName, contactNumber)
 * PUT /users/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, contactNumber, email, profilePicture } = req.body;
    const updates = {};

    if (fullName) updates.fullName = fullName;
    if (contactNumber) updates.contactNumber = contactNumber;
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
    if (email && email !== req.user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ status: false, message: "Email already in use" });
      }
      updates.email = email;
      updates.isVerified = false;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select("-password -emailVerificationOTP -refreshTokens");

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Change password
 * PUT /users/profile/password
 */
exports.changePassword = async (req, res) => {
  try {
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

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        status: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    res.status(200).json({
      status: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// ============ ADDRESS MANAGEMENT ============

/**
 * Add address
 * POST /users/profile/addresses
 */
exports.addAddress = async (req, res) => {
  try {
    const { label, street, city, postalCode, state, country, additionalInfo, isDefault } = req.body;

    if (!street || !city || !postalCode) {
      return res.status(400).json({
        status: false,
        message: "Street, city, and postal code are required",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const newAddress = {
      label: label || "Home",
      street,
      city,
      postalCode,
      state: state || "",
      country: country || "Sri Lanka",
      additionalInfo: additionalInfo || "",
      isDefault: isDefault === true,
    };

    if (newAddress.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      status: true,
      message: "Address added successfully",
      address: user.addresses[user.addresses.length - 1],
    });
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Update address
 * PUT /users/profile/addresses/:addressId
 */
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, street, city, postalCode, state, country, additionalInfo, isDefault } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({
        status: false,
        message: "Address not found",
      });
    }

    if (label !== undefined) address.label = label;
    if (street !== undefined) address.street = street;
    if (city !== undefined) address.city = city;
    if (postalCode !== undefined) address.postalCode = postalCode;
    if (state !== undefined) address.state = state;
    if (country !== undefined) address.country = country;
    if (additionalInfo !== undefined) address.additionalInfo = additionalInfo;
    if (isDefault === true) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
      address.isDefault = true;
    }

    await user.save();

    res.status(200).json({
      status: true,
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Delete address
 * DELETE /users/profile/addresses/:addressId
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    user.addresses.pull(addressId);
    await user.save();

    res.status(200).json({
      status: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Set default address
 * PUT /users/profile/addresses/:addressId/default
 */
exports.setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({
        status: false,
        message: "Address not found",
      });
    }

    user.addresses.forEach((addr) => (addr.isDefault = false));
    address.isDefault = true;
    await user.save();

    res.status(200).json({
      status: true,
      message: "Default address updated",
      address,
    });
  } catch (error) {
    console.error("Set default address error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// ============ PAYMENT PREFERENCES ============

/**
 * Update payment preferences
 * PUT /users/profile/payment-preferences
 */
exports.updateProfilePicture = async (req, res) => {
  try {
    // Store path served by API Gateway: GET /api/user-uploads/:file → user-service /uploads/:file
    // (Do not use APP_URL/3000 — the React app does not host /uploads.)
    const url = req.file
      ? `/api/user-uploads/${req.file.filename}`
      : req.body?.profilePictureUrl;
    if (!url) {
      return res.status(400).json({ status: false, message: "Profile picture URL or file required" });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture: url },
      { new: true }
    ).select("-password -refreshTokens");
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    res.status(200).json({
      status: true,
      message: "Profile picture updated",
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error("Update profile picture error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("sessions")
      .lean();
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    const sessions = (user.sessions || []).map((s) => ({
      id: s._id,
      deviceInfo: s.deviceInfo,
      ip: s.ip,
      createdAt: s.createdAt,
    }));
    res.status(200).json({ status: true, sessions });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    const session = user.sessions?.id(sessionId);
    if (!session) return res.status(404).json({ status: false, message: "Session not found" });
    user.refreshTokens = user.refreshTokens?.filter((t) => t !== session.refreshToken) || [];
    user.sessions.pull(sessionId);
    await user.save({ validateBeforeSave: false });
    res.status(200).json({ status: true, message: "Session revoked" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.updatePaymentPreferences = async (req, res) => {
  try {
    const { defaultPaymentMethod } = req.body;

    const validMethods = ["CARD", "CASH", "BANK_TRANSFER", "WALLET", "COD"];
    if (defaultPaymentMethod && !validMethods.includes(defaultPaymentMethod)) {
      return res.status(400).json({
        status: false,
        message: "Invalid payment method",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (!user.paymentPreferences) {
      user.paymentPreferences = {};
    }
    if (defaultPaymentMethod) {
      user.paymentPreferences.defaultPaymentMethod = defaultPaymentMethod;
    }
    await user.save();

    res.status(200).json({
      status: true,
      message: "Payment preferences updated",
      paymentPreferences: user.paymentPreferences,
    });
  } catch (error) {
    console.error("Update payment preferences error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
