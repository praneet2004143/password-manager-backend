const supabase = require("../config/supabase");
const { getIO } = require("../socket");

const createNotification = async ({
  userId,
  senderId,
  title,
  message,
  type,
  folderId = null,
  passwordId = null,
}) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        sender_id: senderId,
        title,
        message,
        type,
        folder_id: folderId,
        password_id: passwordId,
      })
      .select()
      .single();

    if (error) throw error;

    // Real-time notification
    getIO().to(userId).emit("newNotification", data);

    return data;

  } catch (err) {
    console.log("Notification Error:", err.message);
  }
};

module.exports = createNotification;