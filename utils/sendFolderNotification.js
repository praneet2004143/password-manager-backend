const supabase = require("../config/supabase");
const { getIO } = require("../socket");
const createNotification = require("./createNotification");

const sendFolderNotification = async ({
  folderId,
  senderId,
  passwordId,
  website,
  title,
  message,
  type,
}) => {
  if (!folderId) return;

  const { data: members, error } = await supabase
    .from("folder_shares")
    .select("*")
    .eq("folder_id", folderId);

  if (error || !members?.length) return;

  for (const member of members) {
    await createNotification({
      userId: member.user_id,
      senderId,
      title,
      message,
      type,
      folderId,
      passwordId,
    });

    getIO()
      .to(member.user_id)
      .emit("notification", {
        title,
        message,
        type,
      });
  }
};

module.exports = sendFolderNotification;