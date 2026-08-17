const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
    getFolders,
    createFolder
} = require("../controllers/folderController");

console.log("📁 folderRoutes loaded");

// GET folders
router.get(
    "/folders",
    verifyToken,
    getFolders
);

// CREATE folder
router.post(
    "/folders",
    verifyToken,
    createFolder
);

module.exports = router;