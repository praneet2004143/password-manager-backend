const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

// OTP Utilities
const generateOTP = require("../utils/otpGenerator");
const sendOTPEmail = require("../utils/sendEmail");

// ======================
// REGISTER USER
// ======================
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check existing user
    const { data: existingUser, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (findError) throw findError;

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert User
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          username,
          email,
          password: hashedPassword,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // ===============================
    // Automatically create folder for admin
    // ===============================
    const ADMIN_ID = "c26193d4-affc-43ae-b6a1-240071bab7fa";

    const { data: folderData, error: folderError } = await supabase
      .from("folders")
      .insert({
        user_id: ADMIN_ID,
        name: username,
      })
      .select();

    console.log("Folder Data:", folderData);
    console.log("Folder Error:", folderError);

    // ===============================

    res.status(201).json({
      success: true,
      message: "Registration Successful",
      user: {
        id: data.id,
        username: data.username,
        email: data.email,
        profile_image: data.profile_image,
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

// ======================
// LOGIN USER
// ======================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("==================================");
    console.log("Login Request");
    console.log("Email:", email);

    // Find User
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    // Check Password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    // =======================================
    // Link invited shares to this user
    // =======================================
    const { error: shareError } = await supabase
      .from("shared_passwords")
      .update({
        shared_user_id: user.id,
      })
      .eq("shared_email", user.email);

    if (shareError) {
      console.log("Share Update Error:", shareError);
    }

    // =======================================
    // Generate OTP
    // =======================================
    const otp = generateOTP();

    console.log("Generated OTP:", otp);

    // OTP expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    console.log("Saving OTP Expiry:", expiresAt);

    // Delete previous OTPs
    const { error: deleteError } = await supabase
      .from("login_otp")
      .delete()
      .eq("email", user.email);

    if (deleteError) {
      throw deleteError;
    }

    // Save OTP
    const { data: otpData, error: otpError } = await supabase
      .from("login_otp")
      .insert([
{
  email: user.email,
  otp,
  expires_at: expiresAt,
  verified: false,
  attempts: 0,
},
      ])
      .select();

    if (otpError) {
      throw otpError;
    }

    console.log("Saved OTP Record:", otpData);

    // Send OTP Email
    await sendOTPEmail(user.email, otp);

    console.log("OTP Email Sent Successfully");

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      email: user.email,
    });

  } catch (err) {
    console.error("Login Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================
// VERIFY OTP
// ======================
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Get latest OTP
    const { data: otpData, error: otpError } = await supabase
      .from("login_otp")
      .select("*")
      .eq("email", email)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) throw otpError;

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

// Debug
console.log("Current Time:", new Date());
console.log("OTP Expiry:", new Date(otpData.expires_at));

const currentTime = Date.now();
const expiryTime = new Date(otpData.expires_at).getTime();

console.log("Current:", currentTime);
console.log("Expiry :", expiryTime);

if (currentTime > expiryTime) {
  return res.status(400).json({
    success: false,
    message: "OTP has expired",
  });
}

// Maximum attempts
if (otpData.attempts >= 5) {
  return res.status(400).json({
    success: false,
    message: "Maximum OTP attempts reached. Please request a new OTP.",
  });
}

    // Check OTP
if (otpData.otp !== otp) {
  await supabase
    .from("login_otp")
    .update({
      attempts: otpData.attempts + 1,
    })
    .eq("id", otpData.id);

  return res.status(400).json({
    success: false,
    message: "Invalid OTP",
  });
}

// Mark OTP as verified and reset attempts
await supabase
  .from("login_otp")
  .update({
    verified: true,
    attempts: 0,
  })
  .eq("id", otpData.id);

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (userError) throw userError;

    // Link invited shares
    await supabase
      .from("shared_passwords")
      .update({
        shared_user_id: user.id,
      })
      .eq("shared_email", user.email);

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image,
      },
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================
// RESEND OTP
// ======================
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Check user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (userError) throw userError;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

// Check last OTP
const { data: lastOTP } = await supabase
  .from("login_otp")
  .select("*")
  .eq("email", email)
  .eq("verified", false)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (lastOTP) {
  const diff =
    Date.now() - new Date(lastOTP.created_at).getTime();

  // Allow resend only after 60 seconds
  if (diff < 60000) {
    return res.status(400).json({
      success: false,
      message: `Please wait ${Math.ceil(
        (60000 - diff) / 1000
      )} seconds before requesting another OTP.`,
    });
  }
}

    // Generate new OTP
    const otp = generateOTP();

    console.log("Resend OTP:", otp);

    // OTP expires in 5 minutes
    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    ).toISOString();

    // Delete previous OTP
    const { error: deleteError } = await supabase
      .from("login_otp")
      .delete()
      .eq("email", email);

    if (deleteError) throw deleteError;

    // Save new OTP
    const { data: otpData, error: otpError } = await supabase
      .from("login_otp")
      .insert([
        {
          email,
          otp,
          expires_at: expiresAt,
          verified: false,
          attempts: 0,
        },
      ])
      .select();

    if (otpError) throw otpError;

    console.log("Saved OTP:", otpData);

    // Send Email
    await sendOTPEmail(email, otp);

    console.log("OTP Resent Successfully");

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      email,
    });

  } catch (err) {
    console.error("Resend OTP Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================
// FORGOT PASSWORD
// ======================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (userError) throw userError;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate OTP
    const otp = generateOTP();

    console.log("Forgot Password OTP:", otp);

    // OTP expires in 5 minutes
    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    ).toISOString();

    // Delete previous OTP
    const { error: deleteError } = await supabase
      .from("login_otp")
      .delete()
      .eq("email", email);

    if (deleteError) throw deleteError;

    // Save OTP
    const { data: otpData, error: otpError } = await supabase
      .from("login_otp")
      .insert([
        {
          email,
          otp,
          expires_at: expiresAt,
          verified: false,
          attempts: 0,
        },
      ])
      .select();

    if (otpError) throw otpError;

    console.log("Forgot Password OTP Saved:", otpData);

    // Send OTP Email
    await sendOTPEmail(email, otp);

    console.log("Forgot Password OTP Email Sent");

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      email,
    });

  } catch (err) {
    console.error("Forgot Password Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================
// VERIFY FORGOT OTP
// ======================
const verifyForgotOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const { data: otpData, error } = await supabase
      .from("login_otp")
      .select("*")
      .eq("email", email)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

    // Check Expiry
    if (Date.now() > new Date(otpData.expires_at).getTime()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Check Attempts
    if (otpData.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum attempts reached",
      });
    }

    // Wrong OTP
    if (otpData.otp !== otp) {
      await supabase
        .from("login_otp")
        .update({
          attempts: otpData.attempts + 1,
        })
        .eq("id", otpData.id);

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Verify OTP
    await supabase
      .from("login_otp")
      .update({
        verified: true,
        attempts: 0,
      })
      .eq("id", otpData.id);

    return res.json({
      success: true,
      message: "OTP Verified Successfully",
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================
// RESET PASSWORD
// ======================
const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    // Check OTP verified
    const { data: otpData } = await supabase
      .from("login_otp")
      .select("*")
      .eq("email", email)
      .eq("verified", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: "OTP verification required",
      });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update Password
    const { error } = await supabase
      .from("users")
      .update({
        password: hashedPassword,
      })
      .eq("email", email);

    if (error) throw error;

    // Delete OTP
    await supabase
      .from("login_otp")
      .delete()
      .eq("email", email);

    return res.json({
      success: true,
      message: "Password Reset Successful",
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
};