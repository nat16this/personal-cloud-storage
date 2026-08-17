const multer = require("multer");

// Store uploaded files temporarily in memory
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage
});

module.exports = upload;