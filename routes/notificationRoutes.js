const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  getNotifications,
  markAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

router.get("/", verifyToken, getNotifications);

router.patch("/:id/read", verifyToken, markAsRead);

router.delete("/:id", verifyToken, deleteNotification);

module.exports = router;