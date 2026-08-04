const express = require("express");
const router = express.Router();

const { getMyFolder } = require("../controllers/userController");
const verifyToken = require("../middleware/authMiddleware");

router.get("/my-folder", verifyToken, getMyFolder);

module.exports = router;