const { v4: uuidv4 } = require("uuid");
const transporter = require("../config/mail");
const supabase = require("../config/supabase");
const createNotification = require("../utils/createNotification");
const { encrypt, decrypt } = require("../utils/encryption");
// ======================================
// Share Folder
// ======================================
const shareFolder = async (req, res) => {
  try {

    console.log("========== SHARE REQUEST ==========");
console.log(req.body);
console.log("Logged in User:", req.user);
    const {
      folderId,
      email,
      permission,
      message,
      notify,
    } = req.body;

    const token = uuidv4();

const { data, error } = await supabase
  .from("folder_shares")
  .insert({
    folder_id: folderId,
    owner_id: req.user.id,
    shared_with: email,
    permission,
    message,
    notify,
    share_token: token,
    accepted: false,
  })
  .select()
  .single();

// Debug logs
console.log("Inserted:", data);
console.log("Insert Error:", error);

if (error) throw error;

const shareLink =
  `http://localhost:3000/shared-folder/${token}`;

    if (notify) {

      console.log(process.env.EMAIL);
console.log(process.env.EMAIL_PASSWORD);

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: "Folder Shared With You",
        html: `
          <h2>Password Manager</h2>

          <p>A folder has been shared with you.</p>

          <p><b>Permission:</b> ${permission}</p>

          <p>${message || ""}</p>

          <br>

          <a href="${shareLink}">
            Open Folder
          </a>
        `,
      });
    }

    // Find the recipient user
const { data: receiver } = await supabase
  .from("users")
  .select("id")
  .eq("email", email)
  .single();

if (receiver) {
  await createNotification({
    userId: receiver.id,
    senderId: req.user.id,
    title: "Folder Shared",
    message: "A folder has been shared with you.",
    type: "FOLDER_SHARED",
    folderId,
  });
}

    res.json({
      success: true,
      shareLink,
      data,
    });

} catch (err) {
  console.error("========== SHARE ERROR ==========");
  console.error(err);

  res.status(500).json({
    success: false,
    message: err.message,
    error: err,
  });
}
};

// ======================================
// Get Invitation
// ======================================
const getInvitation = async (req, res) => {
  try {

    const { token } = req.params;

    const { data: invitation, error } = await supabase
      .from("folder_shares")
      .select("*")
      .eq("share_token", token)
      .single();

    if (error || !invitation) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    const { data: folder } = await supabase
      .from("folders")
      .select("*")
      .eq("id", invitation.folder_id)
      .single();

    const { data: owner } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("id", invitation.owner_id)
      .single();

    res.json({
      success: true,
      invitation,
      folder,
      owner,
    });

  }catch (err) {
  console.log("===== ACCEPT INVITATION ERROR =====");
  console.log(err);

  if (err.message) {
    console.log(err.message);
  }

  if (err.details) {
    console.log(err.details);
  }

  if (err.hint) {
    console.log(err.hint);
  }

  if (err.code) {
    console.log(err.code);
  }

  res.status(500).json({
    message: err.message || "Unable to accept invitation",
  });
}
};

// ======================================
// Accept Invitation
// ======================================
const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.body;

    const { data: invitation, error } = await supabase
      .from("folder_shares")
      .select("*")
      .eq("share_token", token)
      .single();

    if (error || !invitation) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    if (invitation.accepted) {
      return res.json({
        success: true,
        message: "Already accepted",
      });
    }

    const { error: updateError } = await supabase
      .from("folder_shares")
      .update({
        accepted: true,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: "Invitation Accepted",
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// ======================================
// Get Shared Users
// ======================================
const getUsers = async (req, res) => {
  try {
    const { folderId } = req.params;

    const { data, error } = await supabase
      .from("folder_shares")
      .select("*")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      users: data || [],
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      users: [],
      message: "Unable to load users",
    });
  }
};



// ======================================
// Update Permission
// ======================================
const updatePermission = async (req, res) => {
  try {

    const { id } = req.params;
    const { permission } = req.body;

    // Get share record
    const { data: share } = await supabase
      .from("folder_shares")
      .select("*")
      .eq("id", id)
      .single();

    if (!share) {
      return res.status(404).json({
        message: "Share not found",
      });
    }

    // Only owner can change permission
    if (share.owner_id !== req.user.id) {
      return res.status(403).json({
        message: "Only owner can change permission",
      });
    }

    const { error } = await supabase
      .from("folder_shares")
      .update({ permission })
      .eq("id", id);

    if (error) throw error;

    res.json({
      success: true,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Permission Update Failed",
    });
  }
};

// ======================================
// Remove User
// ======================================
const removeUser = async (req, res) => {
  try {

    const { id } = req.params;

    const { data: share } = await supabase
      .from("folder_shares")
      .select("*")
      .eq("id", id)
      .single();

    if (!share) {
      return res.status(404).json({
        message: "Share not found",
      });
    }

    if (share.owner_id !== req.user.id) {
      return res.status(403).json({
        message: "Only owner can remove users",
      });
    }

    const { error } = await supabase
      .from("folder_shares")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({
      success: true,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Remove Failed",
    });
  }
};

// ======================================
// Open Shared Folder
// ======================================
const getSharedFolder = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("========== GET SHARED FOLDER ==========");
    console.log("Token:", token);

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
        message: "Invalid Link",
      });
    }

    console.log("Accepted:", share.accepted);

    const { data: folder, error: folderError } = await supabase
      .from("folders")
      .select("*")
      .eq("id", share.folder_id)
      .single();

    console.log("Folder:", folder);
    console.log("Folder Error:", folderError);

    console.log("Searching passwords for folder:", folder.name);

    const { data: passwords, error: passwordError } = await supabase
      .from("passwords")
      .select("*")
      .eq("folder", folder.name)
      .eq("deleted", false);

    console.log("Passwords:", passwords);
    console.log("Password Error:", passwordError);

    const decryptedPasswords = (passwords || []).map((item) => ({
      ...item,
      password: decrypt(item.password),
    }));

    res.json({
      success: true,
      folder: {
        ...folder,
        permission: share.permission,
      },
      passwords: decryptedPasswords,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// Copy Share Link (Per User)
// ======================================
const getShareLink = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("folder_shares")
      .select("id, share_token, shared_with")
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Share not found",
      });
    }

    res.json({
      success: true,
      email: data.shared_with,
      link: `http://localhost:3000/shared-folder/${data.share_token}`,
    });

  } catch (err) {
    console.log("GET SHARE LINK ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// UPDATE PASSWORD FROM SHARED LINK (EDITOR)
// ==========================================
const updateSharedPassword = async (req, res) => {
  try {
    const { token, passwordId } = req.params;
    const {
      website,
      username,
      password,
      category,
    } = req.body;

    // -----------------------------
    // Verify shared link
    // -----------------------------
    const { data: share, error: shareError } = await supabase
      .from("folder_shares")
      .select("*")
      .eq("share_token", token)
      .single();

    if (shareError || !share) {
      return res.status(404).json({
        success: false,
        message: "Invalid share link",
      });
    }

    // -----------------------------
    // Only Editor can edit
    // -----------------------------
    if (share.permission !== "Editor") {
      return res.status(403).json({
        success: false,
        message: "Only editors can edit passwords",
      });
    }

    // -----------------------------
    // Get Folder
    // -----------------------------
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

    // -----------------------------
    // Verify password belongs to folder
    // -----------------------------
    const { data: existing, error: fetchError } = await supabase
      .from("passwords")
      .select("*")
      .eq("id", passwordId)
      .eq("folder", folder.name)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        success: false,
        message: "Password not found in this shared folder",
      });
    }

    // -----------------------------
    // Update password
    // -----------------------------
    const { data, error } = await supabase
      .from("passwords")
      .update({
        website,
        username,
        password: encrypt(password),
        category,
      })
      .eq("id", passwordId)
      .select()
      .single();

    if (error) throw error;

    data.password = decrypt(data.password);

    return res.json({
      success: true,
      message: "Password updated successfully",
      password: data,
    });

  } catch (err) {
    console.error("UPDATE SHARED PASSWORD ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  shareFolder,
  getInvitation,
  acceptInvitation,
  getUsers,
  updatePermission,
  removeUser,
  getShareLink,
  getSharedFolder,
  updateSharedPassword,
};