// const express = require("express");
// const router = express.Router();

// const { signup, login } = require("../controllers/authController");

// console.log("✅ authRoutes.js loaded");

// router.post("/signup", signup);

// module.exports = router;


// const express = require("express");
// const router = express.Router();

// const { signup, login } = require("../controllers/authController");

// console.log("✅ authRoutes.js loaded");

// router.post("/signup", signup);
// router.post("/login", login);

// module.exports = router;

const express = require("express");
const router = express.Router();

const {
    signup,
    login,
    changePassword
} = require("../controllers/authController");

const authenticateUser = require("../middleware/authMiddleware");

console.log("✅ authRoutes.js loaded");

router.post("/signup", signup);
router.post("/login", login);
router.post("/change-password", authenticateUser, changePassword);

module.exports = router;