const supabase = require("../config/supabase");

// ======================================
// Add Comment
// ======================================
const addComment = async (req, res) => {
  try {
    const { passwordId, comment, parentId } = req.body;

    if (!passwordId || !comment?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Password ID and comment are required",
      });
    }

    // ---------------------------------
    // Get Password
    // ---------------------------------
    const { data: password, error: passwordError } = await supabase
      .from("passwords")
      .select("*")
      .eq("id", passwordId)
      .single();

    if (passwordError || !password) {
      return res.status(404).json({
        success: false,
        message: "Password not found",
      });
    }

    // ---------------------------------
    // Owner can always comment
    // ---------------------------------
    if (password.user_id !== req.user.id) {
      // Get Folder
      const { data: folder, error: folderError } = await supabase
        .from("folders")
        .select("id")
        .eq("name", password.folder)
        .single();

      if (folderError || !folder) {
        return res.status(403).json({
          success: false,
          message: "Folder not found",
        });
      }

      // Check Share Permission
      const { data: share } = await supabase
        .from("folder_shares")
        .select("permission")
        .eq("folder_id", folder.id)
        .eq("shared_with", req.user.email)
        .single();

      if (
        !share ||
        (share.permission !== "Commenter" &&
          share.permission !== "Editor")
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to comment",
        });
      }
    }

    // ---------------------------------
    // Save Comment
    // ---------------------------------
    const { data, error } = await supabase
      .from("password_comments")
      .insert({
        password_id: passwordId,
        user_id: req.user.id,
        comment: comment.trim(),
        parent_id: parentId || null,
      })
      .select()
      .single();

    if (error) throw error;

    // ---------------------------------
    // Get Current User
    // ---------------------------------
    const { data: user } = await supabase
      .from("users")
      .select("username,email")
      .eq("id", req.user.id)
      .single();

    return res.json({
      success: true,
      comment: {
        ...data,
        username: user?.username || "Unknown User",
        email: user?.email || "",
      },
    });
  } catch (err) {
    console.error("ADD COMMENT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// Get Comments
// ======================================
const getComments = async (req, res) => {
  try {
    const { passwordId } = req.params;

    // Get comments
    const { data: commentData, error } = await supabase
      .from("password_comments")
      .select("*")
      .eq("password_id", passwordId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Get password folder
    const { data: password } = await supabase
      .from("passwords")
      .select("folder")
      .eq("id", passwordId)
      .single();

    // Get unique user IDs
    const userIds = [...new Set((commentData || []).map(c => c.user_id))];

    // Fetch all users at once
    const { data: users } = await supabase
      .from("users")
      .select("id, username, email, role")
      .in("id", userIds);

    // Create lookup object
    const userMap = {};
    (users || []).forEach(user => {
      userMap[user.id] = user;
    });

    // Build response
    const comments = (commentData || []).map(item => ({
      id: item.id,
      password_id: item.password_id,
      user_id: item.user_id,
      comment: item.comment,
      parent_id: item.parent_id,
      created_at: item.created_at,

username: item.shared_email
  ? item.shared_email
  : userMap[item.user_id]?.username || "Unknown User",

email: item.shared_email
  ? item.shared_email
  : userMap[item.user_id]?.email || "",

role: item.shared_email
  ? "Shared User"
  : userMap[item.user_id]?.role || "User",

isSharedUser: !!item.shared_email,

      folder: password?.folder || "Unknown Folder",
    }));

    res.json({
      success: true,
      comments,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// Get Comments From Shared Folder
// ======================================
const getSharedComments = async (req, res) => {
  try {
    const { token, passwordId } = req.params;

    // ---------------------------------
    // Verify Share Link
    // ---------------------------------
    const { data: share, error: shareError } = await supabase
      .from("folder_shares")
      .select("*")
      .eq("share_token", token)
      .single();

    if (shareError || !share) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired share link",
      });
    }

    // ---------------------------------
    // Get Folder
    // ---------------------------------
    const { data: folder, error: folderError } = await supabase
      .from("folders")
      .select("name")
      .eq("id", share.folder_id)
      .single();

    if (folderError || !folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // ---------------------------------
    // Verify Password belongs to Folder
    // ---------------------------------
    const { data: password, error: passwordError } = await supabase
      .from("passwords")
      .select("id")
      .eq("id", passwordId)
      .eq("folder", folder.name)
      .single();

    if (passwordError || !password) {
      return res.status(404).json({
        success: false,
        message: "Password not found",
      });
    }

    // ---------------------------------
    // Get Comments
    // ---------------------------------
    const { data: commentData, error: commentError } = await supabase
      .from("password_comments")
      .select("*")
      .eq("password_id", passwordId)
      .order("created_at", { ascending: true });

    if (commentError) throw commentError;

    // ---------------------------------
    // Get All Registered Users
    // ---------------------------------
    const userIds = [
      ...new Set(
        (commentData || [])
          .filter((item) => !item.shared_email)
          .map((item) => item.user_id)
      ),
    ];

    let userMap = {};

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, username, email, role")
        .in("id", userIds);

      if (usersError) throw usersError;

      userMap = (users || []).reduce((map, user) => {
        map[user.id] = user;
        return map;
      }, {});
    }

    // ---------------------------------
    // Build Response
    // ---------------------------------
    const comments = (commentData || []).map((item) => {
      let username = "Unknown User";
      let email = "";
      let role = "User";

      if (item.shared_email) {
        // Shared User
        username = item.shared_email;
        email = item.shared_email;
        role = "Shared User";
      } else {
        // Registered User
        const user = userMap[item.user_id];

        if (user) {
          username = user.username;
          email = user.email;
          role = user.role || "User";
        }
      }

      return {
        id: item.id,
        password_id: item.password_id,
        user_id: item.user_id,
        parent_id: item.parent_id,
        comment: item.comment,
        created_at: item.created_at,

        username,
        email,
        role,

        folder: folder.name,
        isSharedUser: !!item.shared_email,
      };
    });

    // ---------------------------------
    // Response
    // ---------------------------------
    return res.json({
      success: true,
      comments,
    });
  } catch (err) {
    console.error("GET SHARED COMMENTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};
// ======================================
// Add Comment From Shared Folder
// ======================================
const addSharedComment = async (req, res) => {
  try {
    const { token } = req.params;
    const { passwordId, comment } = req.body;

    console.log("\n========== ADD SHARED COMMENT ==========");
    console.log("Token:", token);
    console.log("Password ID:", passwordId);
    console.log("Comment:", comment);

    if (!passwordId || !comment?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Password ID and comment are required",
      });
    }

    // ---------------------------------
    // Verify Share Token
    // ---------------------------------
    const { data: share, error: shareError } = await supabase
      .from("folder_shares")
      .select("*")
      .eq("share_token", token)
      .single();

    console.log("Share:", share);
    console.log("Share Error:", shareError);

    if (shareError || !share) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired share link",
      });
    }

    // ---------------------------------
    // Permission Check
    // ---------------------------------
    console.log("Permission:", share.permission);

    if (
      !["Commenter", "Editor"].includes(share.permission)
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to comment",
      });
    }

    // ---------------------------------
    // Get Folder
    // ---------------------------------
    const { data: folder, error: folderError } = await supabase
      .from("folders")
      .select("id, name")
      .eq("id", share.folder_id)
      .single();

    console.log("Folder:", folder);
    console.log("Folder Error:", folderError);

    if (folderError || !folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // ---------------------------------
    // Verify Password
    // ---------------------------------
    const { data: password, error: passwordError } = await supabase
      .from("passwords")
      .select("*")
      .eq("id", passwordId)
      .eq("folder", folder.name)
      .single();

    console.log("Password:", password);
    console.log("Password Error:", passwordError);

    if (passwordError || !password) {
      return res.status(404).json({
        success: false,
        message: "Password not found",
      });
    }

    // ---------------------------------
    // Insert Comment
    // ---------------------------------
    console.log("Inserting Comment...");

    const { data, error } = await supabase
      .from("password_comments")
      .insert({
        password_id: passwordId,
        user_id: null,                 // Shared user
        comment: comment.trim(),
        parent_id: null,
        shared_email: share.shared_with,
        shared_token: token,
      })
      .select()
      .single();

    console.log("Insert Data:", data);
    console.log("Insert Error:", error);

    if (error) throw error;

    console.log("✅ Shared Comment Added Successfully");

    return res.json({
      success: true,
      comment: {
        ...data,
        username: share.shared_with,
        email: share.shared_with,
        role: "Shared User",
        isSharedUser: true,
      },
    });
  } catch (err) {
    console.log("\n========== ADD SHARED COMMENT ERROR ==========");
    console.log(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// ======================================
// Reply Comment
// ======================================
const replyComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    // ---------------------------------
    // Validate Input
    // ---------------------------------
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply is required",
      });
    }

    // ---------------------------------
    // Get Parent Comment
    // ---------------------------------
    const {
      data: parentComment,
      error: parentError,
    } = await supabase
      .from("password_comments")
      .select("*")
      .eq("id", id)
      .single();

    if (parentError || !parentComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // ---------------------------------
    // Get Password
    // ---------------------------------
    const {
      data: password,
      error: passwordError,
    } = await supabase
      .from("passwords")
      .select("*")
      .eq("id", parentComment.password_id)
      .single();

    if (passwordError || !password) {
      return res.status(404).json({
        success: false,
        message: "Password not found",
      });
    }

    let isSharedUser = false;

    // ---------------------------------
    // Permission Check
    // Owner -> Always Allowed
    // Shared User -> Commenter / Editor
    // ---------------------------------
    if (password.user_id !== req.user.id) {
      // Find Folder
      const {
        data: folder,
        error: folderError,
      } = await supabase
        .from("folders")
        .select("id")
        .eq("name", password.folder)
        .single();

      if (folderError || !folder) {
        return res.status(403).json({
          success: false,
          message: "Folder not found",
        });
      }

      // Check Share Permission
      const {
        data: share,
        error: shareError,
      } = await supabase
        .from("folder_shares")
        .select("permission")
        .eq("folder_id", folder.id)
        .eq("shared_with", req.user.email)
        .single();

      if (
        shareError ||
        !share ||
        !["Commenter", "Editor"].includes(share.permission)
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to reply",
        });
      }

      // Current user is a shared user
      isSharedUser = true;
    }

    // ---------------------------------
    // Save Reply
    // ---------------------------------
const insertData = {
  password_id: parentComment.password_id,
  user_id: isSharedUser ? null : req.user.id,
  comment: comment.trim(),
  parent_id: parentComment.id,
};

if (isSharedUser) {
  insertData.shared_email = req.user.email;
}

    const {
      data: reply,
      error: replyError,
    } = await supabase
      .from("password_comments")
      .insert(insertData)
      .select()
      .single();

    if (replyError) throw replyError;

    // ---------------------------------
    // Get Current User
    // ---------------------------------
    const { data: user } = await supabase
      .from("users")
      .select("username,email")
      .eq("id", req.user.id)
      .single();

    // ---------------------------------
    // Response
    // ---------------------------------
    return res.json({
      success: true,
      message: "Reply added successfully",
reply: {
  ...reply,
  username: isSharedUser
    ? req.user.email
    : user?.username || "Unknown User",

  email: isSharedUser
    ? req.user.email
    : user?.email || "",

  role: isSharedUser ? "Shared User" : "User",
  isSharedUser,
},
    });
  } catch (err) {
    console.error("REPLY COMMENT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

/// ======================================
// Reply From Shared Folder
// ======================================
const replySharedComment = async (req, res) => {
  try {
    const { token, id } = req.params;
    const { comment } = req.body;

    // ---------------------------------
    // Validate Input
    // ---------------------------------
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply is required",
      });
    }

    // ---------------------------------
    // Verify Shared Link
    // ---------------------------------
    const { data: share, error: shareError } = await supabase
      .from("folder_shares")
      .select("*")
      .eq("share_token", token)
      .single();

    if (shareError || !share) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired share link",
      });
    }

    // ---------------------------------
    // Permission Check
    // ---------------------------------
    if (!["Commenter", "Editor"].includes(share.permission)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to reply",
      });
    }

    // ---------------------------------
    // Get Parent Comment
    // ---------------------------------
    const { data: parentComment, error: parentError } = await supabase
      .from("password_comments")
      .select("*")
      .eq("id", id)
      .single();

    if (parentError || !parentComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // ---------------------------------
    // Save Reply
    // ---------------------------------
    const { data, error } = await supabase
      .from("password_comments")
      .insert({
        password_id: parentComment.password_id,
        user_id: null,               // Shared user
        comment: comment.trim(),
        parent_id: parentComment.id,
        shared_email: share.shared_with,
        shared_token: token,
      })
      .select()
      .single();

    if (error) throw error;

    // ---------------------------------
    // Response
    // ---------------------------------
    return res.json({
      success: true,
      message: "Reply added successfully",
      reply: {
        ...data,
        username: share.shared_with,
        email: share.shared_with,
        role: "Shared User",
        isSharedUser: true,
      },
    });
  } catch (err) {
    console.error("REPLY SHARED COMMENT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

// ======================================
// Delete Comment
// ======================================
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    // ---------------------------------
    // Get Comment
    // ---------------------------------
    const {
      data: comment,
      error: commentError,
    } = await supabase
      .from("password_comments")
      .select("*")
      .eq("id", id)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // ---------------------------------
    // Permission Check
    // Owner of comment OR Shared user
    // ---------------------------------
    const isOwner = comment.user_id === req.user.id;
    const isSharedUser =
      comment.shared_email &&
      comment.shared_email === req.user.email;

    if (!isOwner && !isSharedUser) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this comment",
      });
    }

    // ---------------------------------
    // Delete Comment
    // ---------------------------------
const { error: deleteError } = await supabase
  .from("password_comments")
  .delete()
  .or(`id.eq.${id},parent_id.eq.${id}`);

    if (deleteError) throw deleteError;

    // ---------------------------------
    // Response
    // ---------------------------------
    return res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (err) {
    console.error("DELETE COMMENT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

module.exports = {
  addComment,
  getComments,
  replyComment,
  deleteComment,
  addSharedComment,
  getSharedComments,
  replySharedComment,
};