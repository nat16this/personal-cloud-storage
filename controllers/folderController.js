const supabase = require("../config/supabase");

// ==========================
// GET ALL FOLDERS
// ==========================
const getFolders = async (req, res) => {
    try {

        const user = req.user;

        const { data, error } = await supabase
            .from("folders")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at");

        if (error) throw error;

        res.json({
            success: true,
            folders: data
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Failed to fetch folders."
        });

    }
};

// ==========================
// CREATE FOLDER
// ==========================
const createFolder = async (req, res) => {

    try {

        const user = req.user;

        const { folder_name, parent_folder_id } = req.body;

        const { data, error } = await supabase
            .from("folders")
            .insert([
                {
                    user_id: user.id,
                    folder_name,
                    parent_folder_id: parent_folder_id || null
                }
            ])
            .select();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: "Folder created successfully.",
            folder: data[0]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Failed to create folder."
        });

    }

};

module.exports = {
    getFolders,
    createFolder
};