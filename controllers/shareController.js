const {
  generateShareLink,
  inviteUsers,
  getSharedUsers,
  updatePermission,
  removeShare,
  getSharedPassword,
  updateSharedPassword,
} = require("../services/shareService");

// ==========================================
// Generate Share Link
// POST /api/share/:passwordId
// ==========================================
const generate = async (req, res) => {
  try {
    const { permission } = req.body;

    const result = await generateShareLink(
      req.params.passwordId,
      req.user.id,
      permission || "viewer"
    );

    console.log("========== SHARE RESULT ==========");
    console.log(result);

    res.json({
      success: true,
      shareLink: result.shareLink,
      token: result.token,
    });
  } catch (err) {
    console.error("========== GENERATE SHARE LINK ERROR ==========");
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// Invite Users
// POST /api/share/invite
// ==========================================
const invite = async (req, res) => {
  try {
    const {
      passwordId,
      emails,
      permission,
      notify,
      message,
    } = req.body;

    const data = await inviteUsers(
      passwordId,
      req.user.id,
      emails,
      permission || "viewer"
    );

    res.json({
      success: true,
      notify,
      message,
      users: data,
    });
  } catch (err) {
    console.error("========== INVITE USERS ERROR ==========");
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
      error: err,
    });
  }
};

// ==========================================
// Get Shared Users
// GET /api/share/:passwordId/users
// ==========================================
const users = async (req, res) => {
  try {
    const data = await getSharedUsers(req.params.passwordId);

    res.json({
      success: true,
      users: data,
    });
  } catch (err) {
    console.error("========== GET SHARED USERS ERROR ==========");
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
      error: err,
    });
  }
};

// ==========================================
// Update Permission
// PUT /api/share/:id
// ==========================================
const permission = async (req, res) => {
  try {
    const data = await updatePermission(
      req.params.id,
      req.body.permission
    );

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("========== UPDATE PERMISSION ERROR ==========");
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
      error: err,
    });
  }
};

// ==========================================
// Remove Share
// DELETE /api/share/:id
// ==========================================
const remove = async (req, res) => {
  try {
    await removeShare(req.params.id);

    res.json({
      success: true,
      message: "User removed successfully",
    });
  } catch (err) {
    console.error("========== REMOVE SHARE ERROR ==========");
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
      error: err,
    });
  }
};

// ==========================================
// Get Shared Password
// GET /api/share/shared/:token
// ==========================================
const sharedPassword = async (req, res) => {
  try {
    const password = await getSharedPassword(req.params.token);

    res.json({
      success: true,
      password,
    });
  } catch (err) {
    console.error("========== SHARED PASSWORD ERROR ==========");
    console.error(err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// Update Shared Password
// PUT /api/share/shared/:token/password/:id
// ==========================================
const updateShared = async (req, res) => {
  try {
    const password = await updateSharedPassword(
      req.params.token,
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      password,
    });
  } catch (err) {
    console.error("========== UPDATE SHARED PASSWORD ERROR ==========");
    console.error(err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  generate,
  invite,
  users,
  permission,
  remove,
  getSharedPassword: sharedPassword,
  updateShared,
};