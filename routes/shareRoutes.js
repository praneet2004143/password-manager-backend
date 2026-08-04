const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  generate,
  invite,
  users,
  permission,
  remove,
  getSharedPassword,
  updateShared,
} = require("../controllers/shareController");

// ===========================================
// Share Password via Email
// POST /api/share/invite
// ===========================================
router.post(
  "/invite",
  verifyToken,
  invite
);

// ===========================================
// Get Shared Users
// GET /api/share/:passwordId/users
// ===========================================
router.get(
  "/:passwordId/users",
  verifyToken,
  users
);

// ===========================================
// Generate Share Link
// POST /api/share/:passwordId
// ===========================================
router.post(
  "/:passwordId",
  verifyToken,
  generate
);

// ===========================================
// Update Permission
// PUT /api/share/:id
// ===========================================
router.put(
  "/:id",
  verifyToken,
  permission
);

// ===========================================
// Remove Shared User
// DELETE /api/share/:id
// ===========================================
router.delete(
  "/:id",
  verifyToken,
  remove
);

// ===========================================
// Get Shared Password (No Login Required)
// GET /api/share/shared/:token
// ===========================================
router.get(
  "/shared/:token",
  getSharedPassword
);

// ===========================================
// Update Shared Password (No Login Required)
// PUT /api/share/shared/:token/password/:id
// ===========================================
router.put(
  "/shared/:token/password/:id",
  updateShared
);

module.exports = router;