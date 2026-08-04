const supabase = require("../config/supabase");

// =====================================
// Get Logged-in User Folder & Passwords
// =====================================
const getMyFolder = async (req, res) => {
  try {
    console.log("========== MY FOLDER ==========");
    console.log("Logged-in User ID:", req.user.id);
    console.log("Logged-in User Email:", req.user.email);

    // Get folder name from user's email
    const folderName = req.user.email
      .split("@")[0]
      .trim()
      .toLowerCase();

    console.log("Looking for folder:", folderName);

    // Find folder by name (case-insensitive)
    const { data: folder, error: folderError } = await supabase
      .from("folders")
      .select("*")
      .ilike("name", folderName)
      .single();

    console.log("Folder:", folder);
    console.log("Folder Error:", folderError);

    if (folderError || !folder) {
      return res.status(404).json({
        success: false,
        message: "No folder found for this user.",
      });
    }

    // Get passwords from that folder (case-insensitive)
    const { data: passwords, error: passwordError } = await supabase
      .from("passwords")
      .select("*")
      .ilike("folder", folder.name)
      .eq("deleted", false)
      .order("created_at", { ascending: false });

    console.log("Passwords Found:", passwords?.length || 0);

    if (passwordError) {
      throw passwordError;
    }

    return res.status(200).json({
      success: true,
      folder,
      passwords,
    });
  } catch (err) {
    console.error("MY FOLDER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getMyFolder,
};