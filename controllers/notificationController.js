const supabase = require("../config/supabase");

// =====================================
// Get Notifications
// =====================================
exports.getNotifications = async (req, res) => {
  try {

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

res.json({
  success: true,
  notifications: data,
});

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Unable to load notifications",
    });

  }
};

// =====================================
// Mark as Read
// =====================================
exports.markAsRead = async (req, res) => {
  try {

    const { id } = req.params;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw error;

    res.json({
      success: true,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Unable to update notification",
    });

  }
};

// =====================================
// Delete Notification
// =====================================
exports.deleteNotification = async (req, res) => {
  try {

    const { id } = req.params;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw error;

    res.json({
      success: true,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Delete Failed",
    });

  }
};