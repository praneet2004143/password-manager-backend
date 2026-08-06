const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const { initSocket } = require("./socket");

// Routes
const authRoutes = require("./routes/authRoutes");
const passwordRoutes = require("./routes/passwordRoutes");
const profileRoutes = require("./routes/profileRoutes");
const folderRoutes = require("./routes/folderRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const shareRoutes = require("./routes/shareRoutes");
const sharedRoutes = require("./routes/sharedRoutes");
const folderShareRoutes = require("./routes/folderShareRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const commentRoutes = require("./routes/commentRoutes");
const app = express();
const userRoutes = require("./routes/userRoutes");
const userSettingRoutes = require("./routes/userSettingRoutes");
// ==============================
// Debug
// ==============================

console.log("SERVER FILE:", __filename);
console.log("CURRENT DIRECTORY:", __dirname);

// ==============================
// Middleware
// ==============================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://password-app-topaz.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.originalUrl);
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==============================
// Routes
// ==============================

app.use("/api/auth", authRoutes);
app.use("/api/passwords", passwordRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/shared", sharedRoutes);
app.use("/api/folder-share", folderShareRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/user", userRoutes);
app.use("/api/settings", userSettingRoutes);
// ==============================
// Test Route
// ==============================

app.get("/", (req, res) => {
  res.send("Password Manager Backend Running...");
});

// ==============================
// Create HTTP Server
// ==============================

const server = http.createServer(app);

// ==============================
// Initialize Socket.IO
// ==============================

initSocket(server);

// ==============================
// Start Server
// ==============================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});