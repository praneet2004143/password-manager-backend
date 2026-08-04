const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const checkPermission = require("../middleware/folderPermission");

const {
  addPassword,
  getPasswords,
  updatePassword,
  deletePassword,
  toggleFavorite,
  getTrash,
  restorePassword,
  permanentDelete,
  getPasswordsByCategory,
  getPasswordsByFolder,
} = require("../controllers/passwordController");

// ===============================
// GET
// ===============================

router.get("/", verifyToken, getPasswords);

router.get("/trash", verifyToken, getTrash);

router.get(
  "/category/:category",
  verifyToken,
  getPasswordsByCategory
);

router.get(
  "/folder/:folder",
  verifyToken,
  checkPermission(["Viewer", "Commenter", "Editor"]),
  getPasswordsByFolder
);

// ===============================
// POST
// ===============================

router.post(
  "/",
  verifyToken,
  upload.single("attachment"),
  addPassword
);

// ===============================
// UPDATE
// ===============================

router.put(
  "/:id",
  verifyToken,
  updatePassword
);

router.patch(
  "/:id/favorite",
  verifyToken,
  toggleFavorite
);

router.patch(
  "/restore/:id",
  verifyToken,
  restorePassword
);

// ===============================
// DELETE
// ===============================

router.delete(
  "/:id",
  verifyToken,
  checkPermission(["Editor"]),
  deletePassword
);

router.delete(
  "/permanent/:id",
  verifyToken,
  permanentDelete
);

module.exports = router;