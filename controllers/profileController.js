const supabase = require("../config/supabase");
const bcrypt = require("bcrypt");

// ===========================
// Upload Profile Picture
// ===========================
const uploadProfilePicture = async (req, res) => {
  try {
    console.log("===== UPLOAD START =====");
    console.log("User:", req.user);
    console.log("File:", req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image selected",
      });
    }

    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;

    console.log("Image URL:", imageUrl);

    const result = await supabase
      .from("users")
      .update({
        profile_image: imageUrl,
      })
      .eq("id", req.user.id);

    console.log("Supabase Result:", result);

    if (result.error) {
      console.log("Supabase Error:", result.error);
      throw result.error;
    }

    res.json({
      success: true,
      image: imageUrl,
    });
  } catch (err) {
    console.error("FULL ERROR:");
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ===========================
// Update Profile
// ===========================
const updateProfile = async (req, res) => {
  try {
    const {
    username,
    email,
    currentPassword,
    newPassword,
} = req.body;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error) throw error;

    const updateData = {
      username,
      email,
    };

    if (newPassword && newPassword.trim() !== "") {
      const valid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!valid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const { data, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", req.user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: data,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  uploadProfilePicture,
  updateProfile,
};