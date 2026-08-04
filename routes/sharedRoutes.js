const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  sharedWithMe,
  getSharedPassword,
} = require("../controllers/sharedController");

// Logged in user
router.get(
  "/",
  verifyToken,
  sharedWithMe
);

// Public share link (NO verifyToken)
router.get(
  "/:token",
  getSharedPassword
);

module.exports = router;