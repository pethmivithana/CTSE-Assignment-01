const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");

exports.googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=oauth_failed`);
    }
    if (user.isDeactivated) {
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=account_deactivated`);
    }
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
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/oauth-callback?token=${accessToken}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=oauth_failed`);
  }
};
