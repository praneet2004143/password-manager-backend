const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const verifyToken = async (req, res, next) => {
  try {
    console.log("========== AUTH REQUEST ==========");
    console.log("Authorization Header:", req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("========== JWT PAYLOAD ==========");
    console.log(decoded);

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, email, role")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    console.log("========== LOGGED IN USER ==========");
    console.log("ID:", user.id);
    console.log("Username:", user.username);
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("====================================");

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("JWT Error:", err.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = verifyToken;