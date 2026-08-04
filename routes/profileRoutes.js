const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const {
  uploadProfilePicture,
  updateProfile,
} = require("../controllers/profileController");

// Upload Profile Picture
// Upload Profile Picture
router.post(
  "/upload",

  (req, res, next) => {
    console.log("✅ Upload route reached");
    next();
  },

  verifyToken,

  upload.single("image"),

  uploadProfilePicture
);

// Update Profile
router.put(
  "/",
  verifyToken,
  updateProfile
);

module.exports = router;