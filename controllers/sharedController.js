const {
  getSharedPasswords,
  getSharedPasswordByToken,
} = require("../services/sharedService");

// ==========================================
// GET /api/shared
// Get all passwords shared with logged-in user
// ==========================================
const sharedWithMe = async (req, res) => {
  try {
    const passwords = await getSharedPasswords(req.user.id);

    return res.status(200).json({
      success: true,
      passwords,
    });

  } catch (err) {
    console.error("========== SHARED WITH ME ERROR ==========");
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// GET /api/shared/:token
// Public route for opening shared password link
// ==========================================
const getSharedPassword = async (req, res) => {
  try {
    const { token } = req.params;

    const password = await getSharedPasswordByToken(token);

    return res.status(200).json({
      success: true,
      password,
    });

  } catch (err) {
    console.error("========== GET SHARED PASSWORD ERROR ==========");
    console.error(err);

    return res.status(404).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  sharedWithMe,
  getSharedPassword,
};