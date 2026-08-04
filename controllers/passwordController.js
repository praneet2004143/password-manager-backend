  const supabase = require("../config/supabase");
  const { getIO } = require("../socket");
  const createNotification = require("../utils/createNotification");
  const sendFolderNotification = require("../utils/sendFolderNotification");
  const { encrypt, decrypt } = require("../utils/encryption");

  
 // ===============================
  // GET ALL PASSWORDS
  // ===============================
  const getPasswords = async (req, res) => {
    try {
      // Get user's folder name from email
      const folderName = req.user.email
        .split("@")[0]
        .trim()
        .toLowerCase();

      // Find user's folder
      const { data: folder } = await supabase
        .from("folders")
        .select("name")
        .ilike("name", folderName)
        .single();

      let passwords = [];

      if (folder) {
        // Get ALL passwords inside that folder
        const { data, error } = await supabase
          .from("passwords")
          .select("*")
          .ilike("folder", folder.name)
          .eq("deleted", false)
          .order("created_at", { ascending: false });

        if (error) throw error;

        passwords = data;
      } else {
        // Fallback -> show only user's own passwords
        const { data, error } = await supabase
          .from("passwords")
          .select("*")
          .eq("user_id", req.user.id)
          .eq("deleted", false)
          .order("created_at", { ascending: false });

        if (error) throw error;

        passwords = data;
      }

      const decryptedData = passwords.map((item) => ({
        ...item,
        password: decrypt(item.password),
      }));

      res.status(200).json({
        success: true,
        count: decryptedData.length,
        passwords: decryptedData,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  // ===============================
  // GET PASSWORDS BY CATEGORY
  // ===============================
  const getPasswordsByCategory = async (req, res) => {
    try {
      const category = decodeURIComponent(req.params.category);

      console.log("Category:", category);

      const { data, error } = await supabase
        .from("passwords")
        .select("*")
        .eq("user_id", req.user.id)
        .eq("deleted", false)
        .eq("category", category)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const decryptedData = data.map((item) => ({
        ...item,
        password: decrypt(item.password),
      }));

      res.status(200).json({
        success: true,
        count: decryptedData.length,
        passwords: decryptedData,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  // ===============================
  // GET PASSWORDS BY FOLDER
  // ===============================
  const getPasswordsByFolder = async (req, res) => {
    try {
      const folderName = decodeURIComponent(req.params.folder);

      const { data, error } = await supabase
        .from("passwords")
        .select("*")
        .ilike("folder", folderName)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const decryptedData = data.map(item => ({
        ...item,
        password: decrypt(item.password),
      }));

      res.json({
        success: true,
        count: decryptedData.length,
        passwords: decryptedData,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  // ===============================
  // ADD PASSWORD
  // ===============================
  const addPassword = async (req, res) => {
    try {
      console.log("BODY:", req.body);
      console.log("FILE:", req.file);

      const {
        website,
        username,
        password,
        category,
        folder,
        expiry_date,
        link,
      } = req.body;

      const attachment = req.file ? req.file.filename : null;

      if (!website || !username || !password) {
        return res.status(400).json({
          success: false,
          message: "Website, Username and Password are required",
        });
      }

      // ==========================================
      // Auto assign user's folder if none provided
      // ==========================================
      let folderName = folder;

      if (!folderName) {
        const userFolderName = req.user.email
          .split("@")[0]
          .trim()
          .toLowerCase();

        const { data: userFolder, error: folderError } = await supabase
          .from("folders")
          .select("name")
          .ilike("name", userFolderName)
          .single();

        if (!folderError && userFolder) {
          folderName = userFolder.name;
        }
      }

      const encryptedPassword = encrypt(password);

      const { data, error } = await supabase
        .from("passwords")
        .insert([
          {
            user_id: req.user.id,
            website,
            username,
            password: encryptedPassword,
            category: category || "Web Account",
            folder: folderName,
            expiry_date: expiry_date || null,
            link: link || null,
            attachment,
            favorite: false,
            deleted: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await sendFolderNotification({
        folderId: data.folder_id,
        senderId: req.user.id,
        passwordId: data.id,
        website: data.website,
        title: "New Password",
        message: `${data.website} was added`,
        type: "PASSWORD_ADDED",
      });

      // ===============================
      // Live Update
      // ===============================
      const room = data.folder_id || data.folder;

      const decryptedPassword = {
        ...data,
        password: decrypt(data.password),
      };

      getIO()
        .to(room)
        .emit("passwordAdded", decryptedPassword);

      res.status(201).json({
        success: true,
        message: "Password Added Successfully",
        password: decryptedPassword,
      });

    } catch (err) {
      console.error("ADD PASSWORD ERROR:", err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };


// ===============================
// UPDATE PASSWORD
// ===============================
const updatePassword = async (req, res) => {
  try {
    console.log("===== UPDATE PASSWORD =====");
    console.log("User:", req.user.email);
    console.log("Password ID:", req.params.id);
    console.log("Request Body:", req.body);

    const { id } = req.params;

    // ======================================
    // Get Existing Password
    // ======================================
    const { data: password, error: fetchError } = await supabase
      .from("passwords")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !password) {
      console.error(fetchError);

      return res.status(404).json({
        success: false,
        message: "Password not found",
      });
    }

    console.log("Existing Record:", password);

    // ======================================
    // Folder Handling
    // ======================================
    let folderName = password.folder;
    let folderId = password.folder_id;

    if (
      req.body.folder &&
      req.body.folder.trim() !== password.folder
    ) {
      console.log("Searching Folder:", req.body.folder);

      const { data: folderData, error: folderError } = await supabase
        .from("folders")
        .select("*")
        .ilike("name", req.body.folder.trim())
        .single();

      if (folderError || !folderData) {
        console.error(folderError);

        return res.status(400).json({
          success: false,
          message: "Folder not found",
        });
      }

      folderName = folderData.name;
      folderId = folderData.id;
    }

    console.log("Folder:", folderName);
    console.log("Folder ID:", folderId);

    // ======================================
    // Permission Check
    // ======================================
    if (password.user_id !== req.user.id) {

      const { data: share, error: shareError } = await supabase
        .from("folder_shares")
        .select("*")
        .ilike("folder_name", password.folder)
        .eq("shared_with", req.user.email)
        .single();

      if (shareError || !share) {
        console.error("Permission Error:", shareError);

        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      if (
        share.permission !== "Editor" &&
        share.permission !== "edit"
      ) {
        return res.status(403).json({
          success: false,
          message: "Only editors can modify passwords",
        });
      }
    }

    // ======================================
    // Build Update Data
    // ======================================
    let updateData = {};

    if (password.user_id === req.user.id) {

      updateData = {
        website: req.body.website,
        username: req.body.username,

        // IMPORTANT:
        // Frontend should send plain password.
        // If it already sends encrypted password,
        // remove encrypt() or fix frontend.
        password: req.body.password
          ? encrypt(req.body.password)
          : password.password,

        category: req.body.category,
        folder: folderName,
        folder_id: folderId,
        description: req.body.description,
        expiry_date: req.body.expiry_date || null,
      };

    } else {

      updateData = {
        username: req.body.username,
      };

      if (req.body.password) {
        updateData.password = encrypt(req.body.password);
      }
    }

    console.log("===== UPDATE DATA =====");
    console.log(updateData);

    // ======================================
    // Update Database
    // ======================================
    const { data, error } = await supabase
      .from("passwords")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("SUPABASE UPDATE ERROR:");
      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    console.log("Updated Record:", data);

    // ======================================
    // Notification
    // ======================================
    try {

      if (folderId) {

        console.log("Sending Notification...");

        await sendFolderNotification({
          folderId,
          senderId: req.user.id,
          passwordId: password.id,
          website: data.website,
          title: "Password Updated",
          message: `${data.website} was updated`,
          type: "PASSWORD_UPDATED",
        });

        console.log("Notification Sent");
      }

    } catch (notifyError) {

      console.error("Notification Error:", notifyError);

    }

    // ======================================
    // Socket
    // ======================================
    try {

      const room = folderId || folderName;

      console.log("Socket Room:", room);

      const decryptedPassword = {
        ...data,
        password: decrypt(data.password),
      };

      getIO().to(room).emit("passwordUpdated", decryptedPassword);

      console.log("Socket Event Sent");

      return res.json({
        success: true,
        message: "Password Updated Successfully",
        password: decryptedPassword,
      });

    } catch (socketError) {

      console.error("Socket Error:", socketError);

      return res.json({
        success: true,
        message: "Password Updated Successfully",
        password: data,
      });

    }

  } catch (err) {

    console.error("UPDATE PASSWORD ERROR:");
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};


  // ===============================
  // DELETE PASSWORD
  // ===============================
  const deletePassword = async (req, res) => {
    try {
      const { id } = req.params;

      // Get password first
      const { data: password } = await supabase
        .from("passwords")
        .select("*")
        .eq("id", id)
        .single();

      // ===============================
      // Only Owner can delete
      // ===============================
      if (password.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Only the owner can delete this password",
        });
      }

      const { error } = await supabase
        .from("passwords")
        .update({
          deleted: true,
        })
        .eq("id", id)
        .eq("user_id", req.user.id);

      if (error) {
        return res.status(500).json({
          success: false,
          error,
        });
      }


  await sendFolderNotification({
    folderId: password.folder,
    senderId: req.user.id,
    passwordId: password.id,
    website: password.website,
    title: "Password Deleted",
    message: `${password.website} was removed`,
    type: "PASSWORD_DELETED",
  });
      // ===============================
      // Live Update
      // ===============================
  const room = password.folder_id || password.folder;

  if (room) {
    getIO()
      .to(room)
      .emit("passwordDeleted", {
        id,
      });
  }

      res.json({
        success: true,
        message: "Moved to Trash",
      });

    } catch (err) {
      console.log(err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  // ===============================
  // TOGGLE FAVORITE
  // ===============================
  const toggleFavorite = async (req, res) => {
    try {
      const { id } = req.params;

      // Get current value
      const { data: current, error: fetchError } = await supabase
        .from("passwords")
        .select("favorite")
        .eq("id", id)
        .eq("user_id", req.user.id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from("passwords")
        .update({
          favorite: !current.favorite,
        })
        .eq("id", id)
        .eq("user_id", req.user.id)
        .select()
        .single();

      if (error) throw error;

  await sendFolderNotification({
    folderId: data.folder_id,
    senderId: req.user.id,
    passwordId: data.id,
    website: data.website,
    title: data.favorite
      ? "Password Favorited"
      : "Password Unfavorited",
    message: `${data.website} was ${
      data.favorite
        ? "marked as favorite"
        : "removed from favorites"
    }`,
    type: "PASSWORD_FAVORITE",
  });

      res.json({
        success: true,
        message: "Favorite Updated",
      password: {
    ...data,
    password: decrypt(data.password),
  },
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  const getTrash = async (req, res) =>  {
    try {
      const { data, error } = await supabase
        .from("passwords")
        .select("*")
        .eq("user_id", req.user.id)
        .eq("deleted", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

  const decryptedData = data.map(item => ({
    ...item,
    password: decrypt(item.password),
  }));

  res.json({
    success: true,
    passwords: decryptedData,
  });

    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  const restorePassword = async (req, res) => {
    try {
      const { id } = req.params;

      const { data: password } = await supabase
        .from("passwords")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("passwords")
        .update({
          deleted: false,
        })
        .eq("id", id)
        .eq("user_id", req.user.id);
        if (error) throw error;

  await sendFolderNotification({
    folderId: password.folder_id,
    senderId: req.user.id,
    passwordId: password.id,
    website: password.website,
    title: "Password Restored",
    message: `${password.website} was restored`,
    type: "PASSWORD_RESTORED",
  });

      // Live Update
  const room = password.folder_id || password.folder;

  if (room) {
    getIO()
      .to(room)
      .emit("passwordRestored", {
        id,
      });
  }
      res.json({
        success: true,
        message: "Password Restored",
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };

  // ===============================
  // PERMANENT DELETE PASSWORD
  // ===============================
  const permanentDelete = async (req, res) => {
    try {
      const { id } = req.params;

      // Get password first
      const { data: password, error: fetchError } = await supabase
        .from("passwords")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !password) {
        return res.status(404).json({
          success: false,
          message: "Password not found",
        });
      }

      // Delete permanently
      const { error } = await supabase
        .from("passwords")
        .delete()
        .eq("id", id)
        .eq("user_id", req.user.id);

      if (error) throw error;

      // ===============================
      // Notifications
      // ===============================
      await sendFolderNotification({
    folderId: password.folder_id,
    senderId: req.user.id,
    passwordId: password.id,
    website: password.website,
    title: "Password Deleted Forever",
    message: `${password.website} was permanently deleted`,
    type: "PASSWORD_PERMANENT_DELETE",
  });

      // ===============================
      // Live Update
      // ===============================
      const room = password.folder_id || password.folder;

      if (room) {
        getIO()
          .to(room)
          .emit("passwordDeleted", {
            id,
          });
      }

      res.json({
        success: true,
        message: "Password Deleted Forever",
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  };



  module.exports = {
    getPasswords,
    getPasswordsByCategory,
    getPasswordsByFolder,
    addPassword,
    updatePassword,
    deletePassword,
    toggleFavorite,
    getTrash,
    restorePassword,
    permanentDelete,
  };