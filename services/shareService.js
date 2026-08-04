const supabase = require("../config/supabase");
const crypto = require("crypto");
const transporter = require("../config/mail");
const { encrypt, decrypt } = require("../utils/encryption");
// ==========================================
// Generate Share Link
// ==========================================
const generateShareLink = async (
  passwordId,
  ownerId,
  permission = "viewer"
) => {

  console.log("========== SHARE DEBUG ==========");
  console.log("passwordId:", passwordId);
  console.log("ownerId:", ownerId);
  console.log("ownerId type:", typeof ownerId);
console.log("passwordId type:", typeof passwordId);

// Debug: List all password IDs
const { data: allPasswords, error: listError } = await supabase
  .from("passwords")
  .select("id");

console.log("========== DATABASE PASSWORDS ==========");
console.log(allPasswords);
console.log("List Error:", listError);

// Existing query
const { data: password, error: passwordError } = await supabase
  .from("passwords")
  .select("*")
  .eq("id", passwordId)
  .single();

console.log("=================================");
console.log("Password Record:", password);
console.log("Password Error:", passwordError);

if (password) {
console.log("Password Owner:", password.user_id);
console.log("Logged-in User:", ownerId);
console.log("Owner type:", typeof password.user_id);
console.log("JWT type:", typeof ownerId);
console.log("Equal:", password.user_id === ownerId);
  console.log("Are they equal?", password.user_id === ownerId);
}

if (passwordError || !password) {
  throw new Error("Password not found.");
}

if (password.user_id !== ownerId) {
  throw new Error("This password does not belong to the logged-in user.");
}

// Check if share link already exists
const { data: existing, error: existingError } = await supabase
  .from("shared_passwords")
  .select("*")
  .eq("password_id", passwordId)
  .eq("owner_id", ownerId)
  .eq("shared_user_id", ownerId)
  .limit(1);

if (existingError) throw existingError;

if (existing && existing.length > 0) {
  return {
    token: existing[0].share_token,
    shareLink: `${process.env.CLIENT_URL}/shared/${existing[0].share_token}`,
    data: existing[0],
  };
}

  const token = crypto.randomUUID();

  const { data, error } = await supabase
    .from("shared_passwords")
    .insert([
      {
        password_id: passwordId,
        owner_id: ownerId,
        shared_user_id: ownerId,
        permission,
        share_token: token,
      },
    ])
    .select()
    .single();

  if (error) {
  console.log("SUPABASE ERROR:", error);
  throw error;
}

  return {
    token,
    shareLink: `${process.env.CLIENT_URL}/shared/${token}`,
    data,
  };
};

// ==========================================
// Invite Users
// ==========================================
const inviteUsers = async (
  passwordId,
  ownerId,
 emails,
permission = "viewer"
) => {

  const { data: password, error: passwordError } = await supabase
    .from("passwords")
    .select("*")
    .eq("id", passwordId)
    .single();

  if (passwordError || !password)
    throw new Error("Password not found.");

  if (password.user_id !== ownerId)
    throw new Error("Not your password.");

  const shared = [];
  const skipped = [];

  for (const email of emails) {

    // Check if email already exists
    const { data: existing } = await supabase
      .from("shared_passwords")
      .select("id")
      .eq("password_id", passwordId)
      .eq("shared_email", email)
      .maybeSingle();

    if (existing) {

      skipped.push({
        email,
        reason: "Already invited"
      });

      continue;
    }

const token = crypto.randomUUID();

// Check if invited email already has an account
const { data: user } = await supabase
  .from("users")
  .select("id")
  .eq("email", email)
  .maybeSingle();

const { data, error } = await supabase
  .from("shared_passwords")
  .insert([
    {
      password_id: passwordId,
      owner_id: ownerId,
      shared_email: email,
      shared_user_id: user?.id || null,
      permission,
      share_token: token,
    },
  ])
  .select()
  .single();

    if (error) throw error;

    shared.push(data);

    const shareLink =
      `${process.env.CLIENT_URL}/shared/${token}`;

    try {

      await transporter.sendMail({

        from: process.env.EMAIL,

        to: email,

        subject: "Password Shared With You",

        html: `
          <h2>Password Shared</h2>

          <p>You have received a shared password.</p>

          <p>
            <b>Website:</b> ${password.website}
          </p>

          <p>
            <b>Username:</b> ${password.username}
          </p>

          <p>
            <b>Permission:</b> ${permission}
          </p>

          <br>

          <a href="${shareLink}">
            Open Shared Password
          </a>

          <br><br>

          <p>
            If you don't have an account, you'll be asked to register first.
          </p>
        `

      });

    } catch (err) {

      console.log(err);

    }

  }

  return {
    shared,
    skipped
  };

};
// ==========================================
// Get Shared Users
// ==========================================
const getSharedUsers = async (passwordId) => {
  const { data: shares, error } = await supabase
    .from("shared_passwords")
    .select("*")
    .eq("password_id", passwordId);

  if (error) throw error;

  const result = [];

  for (const share of shares) {
    if (share.shared_user_id) {
      const { data: user } = await supabase
        .from("users")
        .select("username,email")
        .eq("id", share.shared_user_id)
        .single();

      result.push({
        id: share.id,
        username: user?.username || "",
        email: user?.email || share.shared_email,
        permission: share.permission,
      });
    } else {
      result.push({
        id: share.id,
        username: "",
        email: share.shared_email,
        permission: share.permission,
      });
    }
  }

  return result;
};


// ==========================================
// Update Permission
// ==========================================
const updatePermission = async (
  id,
  permission
) => {
  const { data, error } = await supabase
    .from("shared_passwords")
    .update({
      permission,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
};

// ==========================================
// Remove Share
// ==========================================
const removeShare = async (id) => {
  const { error } = await supabase
    .from("shared_passwords")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
};

const getSharedPassword = async (token) => {
  const { data: share, error } = await supabase
    .from("shared_passwords")
    .select("*")
    .eq("share_token", token)
    .single();

  if (error || !share) {
    throw new Error("Invalid share link.");
  }

  const { data: password, error: passwordError } = await supabase
    .from("passwords")
    .select("*")
    .eq("id", share.password_id)
    .single();

  if (passwordError || !password) {
    throw new Error("Password not found.");
  }

  return {
    ...password,
    password: decrypt(password.password),
    permission: share.permission,
  };
};

const updateSharedPassword = async (
  token,
  passwordId,
  body
) => {
  const { data: share, error: shareError } = await supabase
    .from("shared_passwords")
    .select("*")
    .eq("share_token", token)
    .single();

  if (shareError || !share) {
    throw new Error("Invalid share link.");
  }

  if (share.permission === "viewer") {
    throw new Error("Viewer cannot edit this password.");
  }

  const { data: password, error: passwordError } = await supabase
    .from("passwords")
    .select("*")
    .eq("id", passwordId)
    .single();

  if (passwordError || !password) {
    throw new Error("Password not found.");
  }

  let updateData = {};

  if (share.permission === "editor") {
    updateData = {
      username: body.username || password.username,
      password: body.password
        ? encrypt(body.password)
        : password.password,
    };
  } else {
    updateData = {
      website: body.website,
      username: body.username,
      password: body.password
        ? encrypt(body.password)
        : password.password,
      category: body.category,
      folder: body.folder,
      description: body.description,
      expiry_date: body.expiry_date || null,
    };
  }

  const { data, error } = await supabase
    .from("passwords")
    .update(updateData)
    .eq("id", passwordId)
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    password: decrypt(data.password),
    permission: share.permission,
  };
};

module.exports = {
  generateShareLink,
  inviteUsers,
  getSharedUsers,
  updatePermission,
  removeShare,
  getSharedPassword,
  updateSharedPassword,
};