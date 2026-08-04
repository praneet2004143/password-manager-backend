const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  addComment,
  getComments,
  replyComment,
  deleteComment,
  addSharedComment,
  getSharedComments,
  replySharedComment,
} = require("../controllers/commentController");

// =====================================
// NORMAL COMMENT ROUTES (LOGIN REQUIRED)
// =====================================

// Add comment
router.post("/", verifyToken, addComment);

// Get comments
router.get("/:passwordId", verifyToken, getComments);

// Reply
router.post("/reply/:id", verifyToken, replyComment);

// Delete
router.delete("/:id", verifyToken, deleteComment);

// =====================================
// SHARED FOLDER COMMENT ROUTES
// (Access through share token)
// =====================================

// Get comments from shared folder
router.get(
  "/shared/:token/:passwordId",
  getSharedComments
);

// Add comment from shared folder
router.post(
  "/shared/:token",
  addSharedComment
);

// Reply from shared folder
router.post(
  "/shared/reply/:token/:id",
  replySharedComment
);

module.exports = router;