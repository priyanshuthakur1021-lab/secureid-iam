const express = require("express");

const {
  register,
  sendEmailOtp,
  verifyEmailOtp,
  sendMobileOtp,
  verifyMobileOtp
} = require("../controllers/registrationController");

const router = express.Router();

router.post("/register", register);
router.post("/send-email-otp", sendEmailOtp);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/send-sms-otp", sendMobileOtp);
router.post("/verify-sms-otp", verifyMobileOtp);

module.exports = router;