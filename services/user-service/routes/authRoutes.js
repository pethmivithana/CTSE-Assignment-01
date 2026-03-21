const express = require("express");
const passport = require("passport");
const {
  register,
  registerRequestOTP,
  registerVerifyOTP,
  login,
  getProfile,
  refreshToken,
  logout,
  requestPasswordResetOTP,
  resetPasswordWithOTP,
  changePassword,
} = require("../controllers/authController");
const { requestReactivationOTP, reactivateAccount } = require("../controllers/accountController");
const { googleCallback } = require("../controllers/oauthController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

const hasGoogleAuth = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

router.get("/google", (req, res, next) => {
  if (!hasGoogleAuth()) return res.status(503).json({ status: false, message: "Google login is not configured" });
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});
router.get("/google/callback", (req, res, next) => {
  if (!hasGoogleAuth()) return res.status(503).json({ status: false, message: "Google login is not configured" });
  passport.authenticate("google", { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=oauth_failed`);
    req.user = user;
    googleCallback(req, res);
  })(req, res, next);
});

router.post("/register", registerLimiter, register);
router.post("/register/request-otp", registerLimiter, registerRequestOTP);
router.post("/register/verify-otp", registerLimiter, registerVerifyOTP);
router.post("/login", loginLimiter, login);
router.get("/profile", getProfile);
router.post("/refresh", refreshToken);
router.post("/logout", authMiddleware, logout);

router.post("/forgot-password", forgotPasswordLimiter, requestPasswordResetOTP);
router.post("/reset-password", resetPasswordWithOTP);
router.put("/change-password", authMiddleware, changePassword);

router.post("/reactivate/request-otp", requestReactivationOTP);
router.post("/reactivate", reactivateAccount);

module.exports = router;
