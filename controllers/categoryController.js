const supabase = require("../config/supabase");
const { decrypt } = require("../utils/encryption");

// ===============================
// GET ALL CATEGORIES
// ===============================
const getCategories = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      categories: data,
    });
  } catch (err) {
    console.error("Get Categories Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ===============================
// CREATE CATEGORY
// ===============================
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          user_id: req.user.id,
          name: name.trim(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      category: data,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ===============================
// UPDATE CATEGORY
// ===============================
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const { data, error } = await supabase
      .from("categories")
      .update({
        name: name.trim(),
      })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      category: data,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ===============================
// DELETE CATEGORY
// ===============================
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw error;

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ===============================
// GET PASSWORDS BY CATEGORY
// (Owner + Shared Folder Users)
// ===============================
const getPasswordsByCategory = async (req, res) => {
  try {
    const categoryName = decodeURIComponent(req.params.categoryName);

    // Find user's folder using email
    const folderName = req.user.email
      .split("@")[0]
      .trim()
      .toLowerCase();

    const { data: folder } = await supabase
      .from("folders")
      .select("name")
      .ilike("name", folderName)
      .single();

    let passwords = [];

    if (folder) {
      // Show passwords from shared folder
      const { data, error } = await supabase
        .from("passwords")
        .select("*")
        .ilike("folder", folder.name)
        .ilike("category", categoryName)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      passwords = data;
    } else {
      // Show only user's passwords
      const { data, error } = await supabase
        .from("passwords")
        .select("*")
        .eq("user_id", req.user.id)
        .ilike("category", categoryName)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      passwords = data;
    }

    const decryptedPasswords = passwords.map((item) => ({
      ...item,
      password: decrypt(item.password),
    }));

    res.status(200).json({
      success: true,
      count: decryptedPasswords.length,
      passwords: decryptedPasswords,
    });
  } catch (err) {
    console.error("Category Password Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getPasswordsByCategory,
};