console.log("USING CATEGORY ROUTES");
console.log(__filename);

const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getPasswordsByCategory,
} = require("../controllers/categoryController");

// ===============================
// Debug Middleware
// ===============================
router.use((req, res, next) => {
  console.log("CATEGORY ROUTE:", req.method, req.originalUrl);
  next();
});

// ===============================
// CATEGORY ROUTES
// ===============================

// Get all categories
router.get("/", verifyToken, getCategories);

// Create category
router.post("/", verifyToken, createCategory);

// Update category
router.put("/:id", verifyToken, updateCategory);

// Delete category
router.delete("/:id", verifyToken, deleteCategory);

// Get passwords by category
router.get("/:categoryName", verifyToken, getPasswordsByCategory);

module.exports = router;