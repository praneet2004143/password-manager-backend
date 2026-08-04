const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  getUserFolder,
} = require("../controllers/folderController");

// Get all folders
router.get("/", auth, getFolders);

// Create folder
router.post("/", auth, createFolder);

// Rename folder
router.put("/:id", auth, renameFolder);

// Delete folder
router.delete("/:id", auth, deleteFolder);

// Get logged-in user's folder
router.get("/user-folder", auth, getUserFolder);

module.exports = router;