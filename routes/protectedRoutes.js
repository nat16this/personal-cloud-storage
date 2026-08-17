console.log("🔥 protectedRoutes.js loaded!");

const express = require("express");
const router = express.Router();

const authenticateUser = require("../middleware/authMiddleware");

router.get("/profile", authenticateUser, (req, res) => {
    res.json({
        success: true,
        message: "You accessed a protected route!",
        user: req.user
    });
});

module.exports = router;