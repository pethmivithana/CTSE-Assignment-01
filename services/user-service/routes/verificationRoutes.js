const express = require("express");
const {
  requestOTP,
  verifyOTP,
  resendVerification,
} = require("../controllers/verificationController");

const router = express.Router();

router.post("/request-otp", requestOTP);
router.post("/verify-otp", verifyOTP);
router.post("/resend", resendVerification);

module.exports = router;
