const express = require("express");
const cors = require("cors");
require("dotenv").config();

const fileRoutes = require("./routes/fileRoutes");
const folderRoutes = require("./routes/folderRoutes");

const protectedRoutes = require("./routes/protectedRoutes");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/files", fileRoutes);
app.use("/api", protectedRoutes);
app.use("/api", fileRoutes);
app.use("/api", folderRoutes);

app.get("/test-files-route", (req, res) => {
    res.json({
        message: "The current server.js is running"
    });
});

// Test route
app.get("/hello", (req, res) => {
    res.send("HELLO WORKS");
});

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to the Personal Cloud Storage API!",
        status: "Server is running successfully 🚀"
    });
});

// Supabase connection test
app.get("/test-supabase", (req, res) => {
    res.json({
        test: "This route is working!"
    });
});

// Test POST route
app.post("/test-login", (req, res) => {
    res.json({
        message: "POST routes are working"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});