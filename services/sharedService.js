const supabase = require("../config/supabase");
const { decrypt } = require("../utils/encryption");

// ===============================
// Passwords Shared With Me
// ===============================
const getSharedPasswords = async (userId) => {
  const { data: shares, error } = await supabase
    .from("shared_passwords")
    .select("*")
    .eq("shared_user_id", userId);

  if (error) throw error;

  const result = [];

  for (const share of shares) {
    const { data: password } = await supabase
      .from("passwords")
      .select("*")
      .eq("id", share.password_id)
      .single();

    const { data: owner } = await supabase
      .from("users")
      .select("username,email")
      .eq("id", share.owner_id)
      .single();

    if (password) {
      // Decrypt password before sending
      password.password = decrypt(password.password);

      result.push({
        id: share.id,
        permission: share.permission,
        owner,
        password,
      });
    }
  }

  return result;
};

// ===============================
// Get Password By Share Token
// ===============================
const getSharedPasswordByToken = async (token) => {
  // Find share record
  const { data: share, error } = await supabase
    .from("shared_passwords")
    .select("*")
    .eq("share_token", token)
    .single();

  if (error || !share) {
    throw new Error("Invalid share link");
  }

  // Fetch password
  const { data: password, error: passwordError } = await supabase
    .from("passwords")
    .select("*")
    .eq("id", share.password_id)
    .single();

  if (passwordError || !password) {
    throw new Error("Password not found");
  }

  // Fetch owner
  const { data: owner } = await supabase
    .from("users")
    .select("username,email")
    .eq("id", share.owner_id)
    .single();

  // Decrypt password
  password.password = decrypt(password.password);

  return {
    ...password,
    permission: share.permission,
    owner,
  };
};

module.exports = {
  getSharedPasswords,
  getSharedPasswordByToken,
};