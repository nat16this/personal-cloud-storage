const supabase = require("../config/supabase");

const uploadFile = async (req, res) => {
    try {
        // Check if a file was sent
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded."
            });
        }

        const file = req.file;

        // Create a unique filename
        const fileName = `${Date.now()}-${file.originalname}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from("user-files")
            .upload(fileName, file.buffer, {
                contentType: file.mimetype
            });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(200).json({
            success: true,
            message: "File uploaded successfully!",
            file: data
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = {
    uploadFile
};