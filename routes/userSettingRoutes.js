const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  getProfile,
  updateProfile,
  getNotificationSettings,
  updateNotificationSettings,
  exportPasswords,
  getDevices,
  logoutAllDevices,
} = require("../controllers/userSettingController");

// ==========================================
// Profile
// ==========================================
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

// ==========================================
// Notification Settings
// ==========================================
router.get("/notifications", verifyToken, getNotificationSettings);
router.put("/notifications", verifyToken, updateNotificationSettings);

// ==========================================
// Export Passwords
// ==========================================
router.get("/export", verifyToken, exportPasswords);

// ==========================================
// Devices
// ==========================================
router.get("/devices", verifyToken, getDevices);
router.post("/devices/logout-all", verifyToken, logoutAllDevices);

module.exports = router;