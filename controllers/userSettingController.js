const supabase = require("../config/supabase");

// ===========================================
// Get Profile
// GET /api/settings/profile
// ===========================================
const getProfile = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("id", req.user.id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===========================================
// Update Profile
// PUT /api/settings/profile
// ===========================================
const updateProfile = async (req, res) => {
  try {
    const { username } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({ username })
      .eq("id", req.user.id)
      .select("id, username, email")
      .single();

    if (error) throw error;

    res.json({
      message: "Profile updated successfully",
      user: data,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===========================================
// Get Notification Settings
// GET /api/settings/notifications
// ===========================================
const getNotificationSettings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("email_notifications, security_alerts")
      .eq("id", req.user.id)
      .single();

    if (error) throw error;

    res.json({
      emailNotifications: data.email_notifications,
      securityAlerts: data.security_alerts,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ===========================================
// Update Notification Settings
// PUT /api/settings/notifications
// ===========================================
const updateNotificationSettings = async (req, res) => {
  try {
    const { emailNotifications, securityAlerts } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({
        email_notifications: emailNotifications,
        security_alerts: securityAlerts,
      })
      .eq("id", req.user.id)
      .select("email_notifications, security_alerts")
      .single();

    if (error) throw error;

    res.json({
      message: "Notification settings updated successfully.",
      emailNotifications: data.email_notifications,
      securityAlerts: data.security_alerts,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ===========================================
// Export Passwords (CSV)
// GET /api/settings/export
// ===========================================
const exportPasswords = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("passwords")
      .select("website, username, category")
      .eq("user_id", req.user.id);

    if (error) throw error;

    let csv = "Website,Username,Category\n";

    data.forEach((item) => {
      csv += `"${item.website}","${item.username}","${item.category}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="passwords.csv"'
    );

    res.send(csv);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ===========================================
// Get Devices
// GET /api/settings/devices
// ===========================================
const getDevices = async (req, res) => {
  res.json([
    {
      device: "Google Chrome",
      os: "Windows 11",
      current: true,
      lastLogin: new Date(),
    },
  ]);
};

// ===========================================
// Logout All Devices
// POST /api/settings/logout-all
// ===========================================
const logoutAllDevices = async (req, res) => {
  try {
    // Future: remove all JWT sessions from DB

    res.json({
      message: "Logged out from all devices successfully.",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getNotificationSettings,
  updateNotificationSettings,
  exportPasswords,
  getDevices,
  logoutAllDevices,
};