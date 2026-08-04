const supabase = require("../config/supabase");
const { decrypt } = require("../utils/encryption");

// ===============================
// GET ALL FOLDERS
// ===============================
const getFolders = async (req, res) => {
  try {
    // Get user's folders
    const { data: folders, error: folderError } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true });

    if (folderError) throw folderError;

    const foldersWithCount = await Promise.all(
      folders.map(async (folder) => {
        const { count, error } = await supabase
          .from("passwords")
          .select("*", { count: "exact", head: true })
          .ilike("folder", folder.name)
          .eq("deleted", false);

        if (error) throw error;

        return {
          ...folder,
          count: count || 0,
        };
      })
    );

    res.json({
      success: true,
      folders: foldersWithCount,
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
// CREATE FOLDER
// ===============================
const createFolder = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Folder name is required",
      });
    }

    const { data, error } = await supabase
      .from("folders")
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
      folder: data,
    });
  } catch (err) {
    console.error("CREATE FOLDER ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ===============================
// RENAME FOLDER
// ===============================
const renameFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || String(name).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Folder name is required",
      });
    }

    const { data, error } = await supabase
      .from("folders")
      .update({
        name: String(name).trim(),
      })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      folder: data,
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
// DELETE FOLDER
// ===============================
const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw error;

    res.json({
      success: true,
      message: "Folder Deleted Successfully",
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
// GET USER'S OWN FOLDER
// ===============================
const getUserFolder = async (req, res) => {
  try {
    const email = req.user.email;

    const folderName = email.split("@")[0].trim().toLowerCase();

    const { data: folder, error: folderError } = await supabase
      .from("folders")
      .select("*")
      .ilike("name", folderName)
      .single();

    if (folderError || !folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    const { data: passwords, error: passwordError } = await supabase
      .from("passwords")
      .select("*")
      .eq("folder", folder.name)
      .eq("deleted", false)
      .order("created_at", { ascending: false });

    if (passwordError) throw passwordError;

    const decryptedPasswords = passwords.map((item) => ({
      ...item,
      password: decrypt(item.password),
    }));

    res.json({
      success: true,
      folder,
      passwords: decryptedPasswords,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getFolders,
  getUserFolder,
  createFolder,
  renameFolder,
  deleteFolder,
};