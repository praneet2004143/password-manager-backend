const supabase = require("../config/supabase");

const checkPermission = (allowedPermissions = []) => {
  return async (req, res, next) => {
    try {
let folderId =
  req.body.folderId ||
  req.body.folder_id;

      // If folderId is not sent, get it from the password
if (!folderId && req.params.id) {

  console.log("Password ID:", req.params.id);

  const { data: password, error } = await supabase
    .from("passwords")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  console.log("Password:", password);
  console.log("Error:", error);

  if (!password) {
    return res.status(404).json({
      message: "Password not found",
    });
  }

  if (password.user_id === req.user.id) {
    return next();
  }

  folderId = password.folder_id;
}
// Allow owner access when opening folder by name
if (!folderId && req.params.folder) {
  return next();
}
      if (!folderId) {
        return res.status(400).json({
          message: "Folder ID is required",
        });
      }

      

      const { data: share, error } = await supabase
        .from("folder_shares")
        .select("*")
        .eq("folder_id", folderId)
        .eq("shared_with", req.user.email)
        .single();

      if (error || !share) {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      if (!allowedPermissions.includes(share.permission)) {
        return res.status(403).json({
          message: "Permission Denied",
        });
      }

      req.permission = share.permission;

      next();

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Permission Error",
      });
    }
  };
};

module.exports = checkPermission;