const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const controller = require("../controllers/folderShareController");

// ===============================
// DEBUG (Temporary)
// ===============================
console.log("shareFolder:", controller.shareFolder);
console.log("getInvitation:", controller.getInvitation);
console.log("acceptInvitation:", controller.acceptInvitation);
console.log("getUsers:", controller.getUsers);
console.log("updatePermission:", controller.updatePermission);
console.log("removeUser:", controller.removeUser);
console.log("getShareLink:", controller.getShareLink);
console.log("getSharedFolder:", controller.getSharedFolder);

// ===============================
// Share Folder
// ===============================
router.post("/", verifyToken, controller.shareFolder);

// ===============================
// Get Users With Access
// ===============================
router.get("/users/:folderId", verifyToken, controller.getUsers);

// ===============================
// Update Permission
// ===============================
router.put("/:id", verifyToken, controller.updatePermission);

// ===============================
// Remove User
// ===============================
router.delete("/:id", verifyToken, controller.removeUser);

// ===============================
// Copy Share Link (Per User)
// ===============================
router.get("/link/:id", verifyToken, controller.getShareLink);

// ===============================
// Invitation Page
// ===============================
router.get("/invite/:token", controller.getInvitation);

// ===============================
// Accept Invitation
// ===============================
router.post("/accept", controller.acceptInvitation);

router.put(
  "/shared/:token/password/:passwordId",
  controller.updateSharedPassword
);

// ===============================
// Open Shared Folder
// ===============================
router.get("/shared/:token", controller.getSharedFolder);

// ===============================
// Update Password From Shared Link
// ===============================
router.put(
  "/shared/:token/password/:passwordId",
  controller.updateSharedPassword
);

module.exports = router;