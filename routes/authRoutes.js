const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOTP);
router.post("/reset-password", resetPassword);

module.exports = router;