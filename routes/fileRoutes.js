console.log("🔥 fileRoutes.js loaded!");

const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// MULTER CONFIGURATION
// =====================================================

const upload = multer({
    storage: multer.memoryStorage()
});

// =====================================================
// SUPABASE CLIENT HELPERS
// =====================================================

function getUserSupabase(req) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Authorization header is missing.");
    }

    const accessToken = authHeader.replace("Bearer ", "");

    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        }
    );
}

const adminSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =====================================================
// UPLOAD FILE
// POST /api/upload
// =====================================================

router.post(
    "/upload",
    authenticateUser,
    upload.single("file"),
    async (req, res) => {
        try {
            console.log("🔥 UPLOAD ROUTE HIT");

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "No file uploaded."
                });
            }

            const userSupabase = getUserSupabase(req);

            console.log("BODY:", req.body);
console.log("FOLDER ID:", req.body.folder_id);

            // Optional folder
            let { folder_id = null } = req.body;

            // If a folder was supplied, verify it belongs to the user
            if (folder_id) {

                const {
                    data: folder,
                    error: folderError
                } = await userSupabase
                    .from("folders")
                    .select("id")
                    .eq("id", folder_id)
                    .eq("user_id", req.user.id)
                    .maybeSingle();

                if (folderError) {
                    return res.status(400).json({
                        success: false,
                        message: folderError.message
                    });
                }

                if (!folder) {
                    return res.status(404).json({
                        success: false,
                        message: "Folder not found."
                    });
                }
            }

    const safeFileName = req.file.originalname
    .replace(/[^a-zA-Z0-9._\- ]/g, "_");

const filePath =
    `${req.user.id}/${Date.now()}-${safeFileName}`;

            console.log("===== UPLOAD DEBUG =====");
            console.log("User ID:", req.user.id);
            console.log("Folder ID:", folder_id);
            console.log("File Path:", filePath);

            // Upload to Storage
            const {
                data: storageData,
                error: storageError
            } = await userSupabase.storage
                .from("user-files")
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype
                });

            if (storageError) {
                return res.status(400).json({
                    success: false,
                    message: storageError.message
                });
            }

            // Save metadata in database
            const {
                data: fileRecord,
                error: databaseError
            } = await userSupabase
                .from("files")
                .insert({
                    user_id: req.user.id,
                    original_name: req.file.originalname,
                    storage_path: filePath,
                    file_size: req.file.size,
                    mime_type: req.file.mimetype,
                    folder_id: folder_id
                })
                .select()
                .single();

            // Roll back storage upload if DB insert fails
            if (databaseError) {

                await adminSupabase.storage
                    .from("user-files")
                    .remove([filePath]);

                return res.status(400).json({
                    success: false,
                    message: databaseError.message
                });
            }

            console.log("✅ Upload completed successfully");

            return res.json({
                success: true,
                message: "File uploaded successfully!",
                file: fileRecord,
                storage: storageData
            });

        } catch (err) {

            console.error("UPLOAD ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }
    }
);

// =====================================================
// LIST FILES INSIDE A FOLDER
// GET /api/folders/:folderId/files
// =====================================================

router.get(
    "/folders/:folderId/files",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("📂 LIST FOLDER FILES ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            // Verify the folder belongs to the user
            const {
                data: folder,
                error: folderError
            } = await userSupabase
                .from("folders")
                .select("*")
                .eq("id", req.params.folderId)
                .eq("user_id", req.user.id)
                .maybeSingle();

            if (folderError) {
                return res.status(400).json({
                    success: false,
                    message: folderError.message
                });
            }

            if (!folder) {
                return res.status(404).json({
                    success: false,
                    message: "Folder not found."
                });
            }

            // Get all files in the folder
const {
    data: files,
    error: filesError
} = await userSupabase
    .from("files")
    .select("*")
    .eq("user_id", req.user.id)
    .eq("folder_id", req.params.folderId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
            if (filesError) {
                return res.status(400).json({
                    success: false,
                    message: filesError.message
                });
            }

            return res.json({
                success: true,
                folder,
                files
            });

        } catch (err) {

            console.error("LIST FOLDER FILES ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);



// =====================================================
// DOWNLOAD FILE
// GET /api/files/download/:fileId
// =====================================================

router.get(
    "/files/download/:fileId",
    authenticateUser,
    async (req, res) => {
        try {
            const userSupabase = getUserSupabase(req);

const {
    data: file,
    error: databaseError
} = await userSupabase
    .from("files")
    .select("*")
    .eq("id", req.params.fileId)
    .eq("user_id", req.user.id)
    .is("deleted_at", null)
    .maybeSingle();


            if (databaseError || !file) {
                return res.status(404).json({
                    success: false,
                    message: "File not found."
                });
            }

            console.log("===== DOWNLOAD DEBUG =====");
            console.log("File:", file.original_name);
            console.log("Storage path:", file.storage_path);

            const {
                data,
                error
            } = await userSupabase.storage
                .from("user-files")
                .download(file.storage_path);

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.setHeader(
                "Content-Type",
                file.mime_type || "application/octet-stream"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${file.original_name}"`
            );

            const arrayBuffer = await data.arrayBuffer();
            return res.send(Buffer.from(arrayBuffer));
        } catch (err) {
            console.error("DOWNLOAD ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);

// =====================================================
// RENAME FILE
// PATCH /api/files/:fileId
// =====================================================

router.patch(
    "/files/:fileId",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("🔥 RENAME ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            let { newName } = req.body;

            if (!newName || !newName.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "New filename is required."
                });
            }

            newName = newName.trim();

            // Prevent folder paths
            if (newName.includes("/") || newName.includes("\\")) {
                return res.status(400).json({
                    success: false,
                    message: "Filename cannot contain folder paths."
                });
            }

            // ============================================
            // Find the file
            // ============================================

            const {
                data: file,
                error: fileError
            } = await userSupabase
                .from("files")
                .select("*")
                .eq("id", req.params.fileId)
                .eq("user_id", req.user.id)
                .maybeSingle();

            if (fileError) {
                return res.status(400).json({
                    success: false,
                    message: fileError.message
                });
            }

            if (!file) {
                return res.status(404).json({
                    success: false,
                    message: "File not found."
                });
            }

            // ============================================
            // Preserve original extension
            // ============================================

            const originalName = file.original_name;

            const dotIndex = originalName.lastIndexOf(".");

            let extension = "";

            if (dotIndex !== -1) {
                extension = originalName.substring(dotIndex);
            }

            // If the database somehow lost the extension,
            // recover it from the MIME type.
            if (!extension) {

                const mimeMap = {
                    "image/png": ".png",
                    "image/jpeg": ".jpg",
                    "image/jpg": ".jpg",
                    "image/gif": ".gif",
                    "image/webp": ".webp",

                    "application/pdf": ".pdf",

                    "text/plain": ".txt",

                    "application/zip": ".zip",

                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
                    "application/msword": ".doc",

                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
                    "application/vnd.ms-excel": ".xls",

                    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
                    "application/vnd.ms-powerpoint": ".ppt"
                };

                extension = mimeMap[file.mime_type] || "";
            }

            // Remove any extension the user typed

            const userDot = newName.lastIndexOf(".");

            if (userDot !== -1) {
                newName = newName.substring(0, userDot);
            }

            newName = newName.trim();

            const finalName = newName + extension;

            console.log("===== RENAME DEBUG =====");
            console.log("Old Name:", file.original_name);
            console.log("Mime:", file.mime_type);
            console.log("Extension:", extension);
            console.log("Final Name:", finalName);

            if (finalName === file.original_name) {
                return res.status(400).json({
                    success: false,
                    message: "The file already has this name."
                });
            }

            // ============================================
            // ONLY update the database
            // Never rename the storage object
            // ============================================

            const {
                data: updatedFile,
                error: updateError
            } = await adminSupabase
                .from("files")
                .update({
                    original_name: finalName
                })
                .eq("id", file.id)
                .eq("user_id", req.user.id)
                .select()
                .single();

            if (updateError) {

                console.error(updateError);

                return res.status(400).json({
                    success: false,
                    message: updateError.message
                });

            }

            console.log("✅ Rename successful");

            return res.json({
                success: true,
                message: "File renamed successfully!",
                file: updatedFile
            });

        }

        catch (err) {

            console.error("RENAME ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);
// =====================================================
// MOVE FILE TO FOLDER
// PATCH /api/files/:fileId/move
// =====================================================

console.log("✅ Registering MOVE FILE route");
router.patch(
    "/files/:fileId/move",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("📂 MOVE FILE ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            const { folder_id } = req.body;

            // -------------------------------------------------

            const {
                data: file,
                error: fileError
            } = await userSupabase
                .from("files")
                .select("*")
                .eq("id", req.params.fileId)
                .eq("user_id", req.user.id)
                .maybeSingle();

            if (fileError || !file) {
                return res.status(404).json({
                    success: false,
                    message: "File not found."
                });
            }

            // -------------------------------------------------
            // If folder_id is null,
            // move file back to root
            // -------------------------------------------------

            if (folder_id !== null) {

                const {
                    data: folder,
                    error: folderError
                } = await userSupabase
                    .from("folders")
                    .select("id")
                    .eq("id", folder_id)
                    .eq("user_id", req.user.id)
                    .maybeSingle();

                if (folderError || !folder) {
                    return res.status(404).json({
                        success: false,
                        message: "Folder not found."
                    });
                }

            }

            // -------------------------------------------------

            const {
                data: updatedFile,
                error: updateError
            } = await adminSupabase
                .from("files")
                .update({
                    folder_id: folder_id
                })
                .eq("id", file.id)
                .eq("user_id", req.user.id)
                .select()
                .single();

            if (updateError) {

                return res.status(400).json({
                    success: false,
                    message: updateError.message
                });

            }

            return res.json({

                success: true,

                message: folder_id === null
                    ? "File moved to root."
                    : "File moved successfully.",

                file: updatedFile

            });

        }

        catch (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);

// =====================================================
// DELETE FILE → MOVE TO TRASH
// DELETE /api/files/:fileId
// =====================================================

router.delete(
    "/files/:fileId",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("🗑 MOVE FILE TO TRASH ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            // Find the file
            const {
                data: file,
                error: fileError
            } = await userSupabase
                .from("files")
                .select("*")
                .eq("id", req.params.fileId)
                .eq("user_id", req.user.id)
                .maybeSingle();

            if (fileError) {
                return res.status(400).json({
                    success: false,
                    message: fileError.message
                });
            }

            if (!file) {
                return res.status(404).json({
                    success: false,
                    message: "File not found."
                });
            }

            // Move file to Trash
            const {
                data: updatedFile,
                error: updateError
            } = await adminSupabase
                .from("files")
                .update({
                    deleted_at: new Date().toISOString()
                })
                .eq("id", file.id)
                .eq("user_id", req.user.id)
                .select()
                .single();

            if (updateError) {
                console.error("TRASH UPDATE ERROR:", updateError);

                return res.status(400).json({
                    success: false,
                    message: updateError.message
                });
            }

            console.log("🗑 File moved to Trash:", file.original_name);

            return res.json({
                success: true,
                message: "File moved to Trash.",
                file: updatedFile
            });

        } catch (err) {

            console.error("MOVE TO TRASH ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);


// =====================================================
// CREATE FOLDER
// POST /api/folders
// =====================================================

router.post(
    "/folders",
    authenticateUser,
    async (req, res) => {
        try {
            console.log("🔥 CREATE FOLDER ROUTE HIT");
            console.log("REQUEST BODY:", req.body);

            const userSupabase = getUserSupabase(req);

            let {
                folder_name,
                parent_folder_id = null
            } = req.body;

            if (!folder_name || !folder_name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Folder name is required."
                });
            }

            folder_name = folder_name.trim();

            // Check for duplicate folder name inside the same parent
            let duplicateQuery = userSupabase
                .from("folders")
                .select("id")
                .eq("user_id", req.user.id)
                .eq("folder_name", folder_name);

            if (parent_folder_id === null) {
                duplicateQuery = duplicateQuery.is("parent_folder_id", null);
            } else {
                duplicateQuery = duplicateQuery.eq(
                    "parent_folder_id",
                    parent_folder_id
                );
            }

            const {
                data: existingFolder,
                error: duplicateError
            } = await duplicateQuery.maybeSingle();

            if (duplicateError) {
                return res.status(400).json({
                    success: false,
                    message: duplicateError.message
                });
            }

            if (existingFolder) {
                return res.status(400).json({
                    success: false,
                    message: "A folder with that name already exists here."
                });
            }

            const {
                data: folder,
                error
            } = await userSupabase
                .from("folders")
                .insert({
                    user_id: req.user.id,
                    folder_name,
                    parent_folder_id
                })
                .select()
                .single();

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.log("✅ Folder created");

            return res.json({
                success: true,
                message: "Folder created successfully!",
                folder
            });

        } catch (err) {
            console.error("CREATE FOLDER ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);

// =====================================================
// RENAME FOLDER
// PATCH /api/folders/:folderId
// =====================================================

router.patch(
    "/folders/:folderId",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("📁 RENAME FOLDER ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            let { folder_name } = req.body;

            if (!folder_name || !folder_name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Folder name is required."
                });
            }

            folder_name = folder_name.trim();

            const {
                data: folder,
                error: folderError
            } = await userSupabase
                .from("folders")
                .select("*")
                .eq("id", req.params.folderId)
                .eq("user_id", req.user.id)
                .maybeSingle();

            if (folderError) {
                return res.status(400).json({
                    success: false,
                    message: folderError.message
                });
            }

            if (!folder) {
                return res.status(404).json({
                    success: false,
                    message: "Folder not found."
                });
            }

            // Prevent duplicate folder names in the same parent
            let duplicateQuery = userSupabase
                .from("folders")
                .select("id")
                .eq("user_id", req.user.id)
                .eq("folder_name", folder_name)
                .neq("id", folder.id);

            if (folder.parent_folder_id === null) {
                duplicateQuery = duplicateQuery.is("parent_folder_id", null);
            } else {
                duplicateQuery = duplicateQuery.eq(
                    "parent_folder_id",
                    folder.parent_folder_id
                );
            }

            const {
                data: duplicate,
                error: duplicateError
            } = await duplicateQuery.maybeSingle();

            if (duplicateError) {
                return res.status(400).json({
                    success: false,
                    message: duplicateError.message
                });
            }

            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    message: "A folder with that name already exists here."
                });
            }

            const {
                data: updatedFolder,
                error: updateError
            } = await adminSupabase
                .from("folders")
                .update({
                    folder_name
                })
                .eq("id", folder.id)
                .eq("user_id", req.user.id)
                .select()
                .single();

            if (updateError) {
                return res.status(400).json({
                    success: false,
                    message: updateError.message
                });
            }

            console.log("✅ Folder renamed successfully");

            return res.json({
                success: true,
                message: "Folder renamed successfully!",
                folder: updatedFolder
            });

        } catch (err) {

            console.error("RENAME FOLDER ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);

// =====================================================
// DELETE FOLDER
// DELETE /api/folders/:folderId
// =====================================================

router.delete(
    "/folders/:folderId",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("🗑 DELETE FOLDER ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            // Verify folder exists
            const {
                data: folder,
                error: folderError
            } = await userSupabase
                .from("folders")
                .select("*")
                .eq("id", req.params.folderId)
                .eq("user_id", req.user.id)
                .maybeSingle();

            if (folderError) {
                return res.status(400).json({
                    success: false,
                    message: folderError.message
                });
            }

            if (!folder) {
                return res.status(404).json({
                    success: false,
                    message: "Folder not found."
                });
            }

            // Check for files inside
            const {
                data: files,
                error: filesError
            } = await userSupabase
                .from("files")
                .select("id")
                .eq("folder_id", folder.id);

            if (filesError) {
                return res.status(400).json({
                    success: false,
                    message: filesError.message
                });
            }

            if (files.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Folder is not empty."
                });
            }

            // Check for child folders
            const {
                data: childFolders,
                error: childError
            } = await userSupabase
                .from("folders")
                .select("id")
                .eq("parent_folder_id", folder.id);

            if (childError) {
                return res.status(400).json({
                    success: false,
                    message: childError.message
                });
            }

            if (childFolders.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Folder contains subfolders."
                });
            }

            // Delete folder
            const {
                error: deleteError
            } = await adminSupabase
                .from("folders")
                .delete()
                .eq("id", folder.id)
                .eq("user_id", req.user.id);

            if (deleteError) {
                return res.status(400).json({
                    success: false,
                    message: deleteError.message
                });
            }

            console.log("✅ Folder deleted");

            return res.json({
                success: true,
                message: "Folder deleted successfully!"
            });

        } catch (err) {

            console.error("DELETE FOLDER ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);

// =====================================================
// MOVE FOLDER
// PATCH /api/folders/:folderId/move
// =====================================================

router.patch(
    "/folders/:folderId/move",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("📂 MOVE FOLDER ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            const { parent_folder_id = null } = req.body;

            // Find folder to move
            const {
                data: folder,
                error: folderError
            } = await userSupabase
                .from("folders")
                .select("*")
                .eq("id", req.params.folderId)
                .eq("user_id", req.user.id)
                .maybeSingle();

            if (folderError) {
                return res.status(400).json({
                    success: false,
                    message: folderError.message
                });
            }

            if (!folder) {
                return res.status(404).json({
                    success: false,
                    message: "Folder not found."
                });
            }

            // Prevent moving a folder into itself
            if (parent_folder_id === folder.id) {
                return res.status(400).json({
                    success: false,
                    message: "A folder cannot be moved into itself."
                });
            }

            // Verify destination folder (if not moving to root)
            if (parent_folder_id !== null) {

                const {
                    data: destination,
                    error: destinationError
                } = await userSupabase
                    .from("folders")
                    .select("id")
                    .eq("id", parent_folder_id)
                    .eq("user_id", req.user.id)
                    .maybeSingle();

                if (destinationError) {
                    return res.status(400).json({
                        success: false,
                        message: destinationError.message
                    });
                }

                if (!destination) {
                    return res.status(404).json({
                        success: false,
                        message: "Destination folder not found."
                    });
                }
            }

            const {
                data: updatedFolder,
                error: updateError
            } = await adminSupabase
                .from("folders")
                .update({
                    parent_folder_id
                })
                .eq("id", folder.id)
                .eq("user_id", req.user.id)
                .select()
                .single();

            if (updateError) {
                return res.status(400).json({
                    success: false,
                    message: updateError.message
                });
            }

            console.log("✅ Folder moved successfully");

            return res.json({
                success: true,
                message:
                    parent_folder_id === null
                        ? "Folder moved to root."
                        : "Folder moved successfully.",
                folder: updatedFolder
            });

        } catch (err) {

            console.error("MOVE FOLDER ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);

// =====================================================
// LIST FOLDERS
// GET /api/folders
// =====================================================

router.get(
    "/folders",
    authenticateUser,
    async (req, res) => {

        try {

            const userSupabase = getUserSupabase(req);

            const { data, error } = await userSupabase
                .from("folders")
                .select("*")
                .eq("user_id", req.user.id)
                .order("created_at", { ascending: true });

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.json({
                success: true,
                folders: data
            });

        } catch (err) {

            console.error("LIST FOLDERS ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);

// =====================================================
// LIST ROOT FILES
// GET /api/files
// =====================================================

router.get(
  "/files",
  authenticateUser,
  async (req, res) => {
    try {
      const userSupabase = getUserSupabase(req);

const { data, error } = await userSupabase
  .from("files")
  .select("*")
  .eq("user_id", req.user.id)
  .is("folder_id", null)
  .is("deleted_at", null)
  .order("created_at", { ascending: false });

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.json({
        success: true,
        files: data,
      });
    } catch (err) {
      console.error("LIST FILES ERROR:", err);

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);


// =====================================================
// RESTORE FILE FROM TRASH
// PATCH /api/files/:fileId/restore
// =====================================================

router.patch(
    "/files/:fileId/restore",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("♻️ RESTORE FILE ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            // Find the deleted file
            const {
                data: file,
                error: fileError
            } = await userSupabase
                .from("files")
                .select("*")
                .eq("id", req.params.fileId)
                .eq("user_id", req.user.id)
                .not("deleted_at", "is", null)
                .maybeSingle();

            if (fileError) {
                console.error("RESTORE FIND ERROR:", fileError);

                return res.status(400).json({
                    success: false,
                    message: fileError.message
                });
            }

            if (!file) {
                return res.status(404).json({
                    success: false,
                    message: "File not found in Trash."
                });
            }

            // Restore the file
            const {
                data: restoredFile,
                error: restoreError
            } = await adminSupabase
                .from("files")
                .update({
                    deleted_at: null
                })
                .eq("id", file.id)
                .eq("user_id", req.user.id)
                .select()
                .single();

            if (restoreError) {

                console.error(
                    "RESTORE UPDATE ERROR:",
                    restoreError
                );

                return res.status(400).json({
                    success: false,
                    message: restoreError.message
                });
            }

            console.log(
                "♻️ File restored:",
                file.original_name
            );

            return res.json({
                success: true,
                message: "File restored successfully.",
                file: restoredFile
            });

        } catch (err) {

            console.error(
                "RESTORE FILE ERROR:",
                err
            );

            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);

// =====================================================
// DELETE FILE FOREVER
// DELETE /api/files/:fileId/permanent
// =====================================================

router.delete(
    "/files/:fileId/permanent",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("🔥 DELETE FILE FOREVER ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            // Find the file in Trash
            const {
                data: file,
                error: fileError
            } = await userSupabase
                .from("files")
                .select("*")
                .eq("id", req.params.fileId)
                .eq("user_id", req.user.id)
                .not("deleted_at", "is", null)
                .maybeSingle();

            if (fileError) {

                console.error(
                    "PERMANENT DELETE FIND ERROR:",
                    fileError
                );

                return res.status(400).json({
                    success: false,
                    message: fileError.message
                });
            }

            if (!file) {
                return res.status(404).json({
                    success: false,
                    message: "File not found in Trash."
                });
            }

            console.log(
                "🔥 Permanently deleting:",
                file.original_name
            );

            console.log(
                "Storage path:",
                file.storage_path
            );

            // =================================================
            // 1. DELETE ACTUAL FILE FROM SUPABASE STORAGE
            // =================================================

            const {
                error: storageError
            } = await adminSupabase.storage
                .from("user-files")
                .remove([
                    file.storage_path
                ]);

            if (storageError) {

                console.error(
                    "STORAGE DELETE ERROR:",
                    storageError
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Could not delete file from storage: " +
                        storageError.message
                });
            }

            // =================================================
            // 2. DELETE FILE RECORD FROM DATABASE
            // =================================================

            const {
                error: databaseError
            } = await adminSupabase
                .from("files")
                .delete()
                .eq("id", file.id)
                .eq("user_id", req.user.id);

            if (databaseError) {

                console.error(
                    "DATABASE DELETE ERROR:",
                    databaseError
                );

                return res.status(400).json({
                    success: false,
                    message: databaseError.message
                });
            }

            console.log(
                "🔥 File permanently deleted:",
                file.original_name
            );

            return res.json({
                success: true,
                message: "File permanently deleted."
            });

        } catch (err) {

            console.error(
                "PERMANENT DELETE ERROR:",
                err
            );

            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);

// =====================================================
// LIST TRASH
// GET /api/trash
// =====================================================

router.get(
    "/trash",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("🗑 TRASH ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            const {
                data: files,
                error
            } = await userSupabase
                .from("files")
                .select("*")
                .eq("user_id", req.user.id)
                .not("deleted_at", "is", null)
                .order("deleted_at", { ascending: false });

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.json({
                success: true,
                files
            });

        } catch (err) {

            console.error("LIST TRASH ERROR:", err);

            return res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);


// =====================================================
// CREATE FILE SHARE LINK
// POST /api/files/:fileId/share
// =====================================================

router.post(
    "/files/:fileId/share",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("🔗 CREATE SHARE LINK ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            // Find the file
            const {
                data: file,
                error: fileError
            } = await userSupabase
                .from("files")
                .select("*")
                .eq("id", req.params.fileId)
                .eq("user_id", req.user.id)
                .is("deleted_at", null)
                .maybeSingle();

            if (fileError) {

                console.error(
                    "SHARE FILE FIND ERROR:",
                    fileError
                );

                return res.status(400).json({
                    success: false,
                    message: fileError.message
                });
            }

            if (!file) {

                return res.status(404).json({
                    success: false,
                    message: "File not found."
                });
            }

            // Generate a unique share token
            const shareToken =
                require("crypto").randomBytes(32).toString("hex");

            // Create share record
            const {
                data: share,
                error: shareError
            } = await adminSupabase
                .from("file_shares")
                .insert({
                    file_id: file.id,
                    user_id: req.user.id,
                    share_token: shareToken
                })
                .select()
                .single();

            if (shareError) {

                console.error(
                    "CREATE SHARE ERROR:",
                    shareError
                );

                return res.status(400).json({
                    success: false,
                    message: shareError.message
                });
            }

            console.log(
                "🔗 Share link created for:",
                file.original_name
            );

            return res.json({
                success: true,
                message: "Share link created successfully.",
                share
            });

        } catch (err) {

            console.error(
                "CREATE SHARE LINK ERROR:",
                err
            );

            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);

// =====================================================
// PUBLIC SHARED FILE ACCESS
// GET /api/share/:shareToken
// =====================================================

router.get(
    "/share/:shareToken",
    async (req, res) => {

        try {

            console.log("🔗 PUBLIC SHARE ROUTE HIT");

            const { shareToken } = req.params;

            // Find the share
            const {
                data: share,
                error: shareError
            } = await adminSupabase
                .from("file_shares")
                .select("*")
                .eq("share_token", shareToken)
                .eq("is_active", true)
                .maybeSingle();

            if (shareError) {

                console.error(
                    "SHARE LOOKUP ERROR:",
                    shareError
                );

                return res.status(400).json({
                    success: false,
                    message: shareError.message
                });
            }

            if (!share) {

                return res.status(404).json({
                    success: false,
                    message: "Share link is invalid or no longer active."
                });
            }

            // Check expiration
            if (
                share.expires_at &&
                new Date(share.expires_at) < new Date()
            ) {

                return res.status(410).json({
                    success: false,
                    message: "This share link has expired."
                });
            }

            // Find the actual file
            const {
                data: file,
                error: fileError
            } = await adminSupabase
                .from("files")
                .select("*")
                .eq("id", share.file_id)
                .maybeSingle();

            if (fileError) {

                console.error(
                    "SHARED FILE LOOKUP ERROR:",
                    fileError
                );

                return res.status(400).json({
                    success: false,
                    message: fileError.message
                });
            }

            if (!file || file.deleted_at) {

                return res.status(404).json({
                    success: false,
                    message: "File is no longer available."
                });
            }

            // Download file from Supabase Storage
            const {
                data,
                error: storageError
            } = await adminSupabase.storage
                .from("user-files")
                .download(file.storage_path);

            if (storageError) {

                console.error(
                    "SHARED FILE STORAGE ERROR:",
                    storageError
                );

                return res.status(400).json({
                    success: false,
                    message: storageError.message
                });
            }

            res.setHeader(
                "Content-Type",
                file.mime_type || "application/octet-stream"
            );

            res.setHeader(
                "Content-Disposition",
                `inline; filename="${file.original_name}"`
            );

            const arrayBuffer = await data.arrayBuffer();

            return res.send(
                Buffer.from(arrayBuffer)
            );

        } catch (err) {

            console.error(
                "PUBLIC SHARE ERROR:",
                err
            );

            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);

// =====================================================
// TOGGLE FILE FAVORITE
// PATCH /api/files/:fileId/favorite
// =====================================================

router.patch(
    "/files/:fileId/favorite",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("⭐ TOGGLE FAVORITE ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            // Find the file
            const {
                data: file,
                error: fileError
            } = await userSupabase
                .from("files")
                .select("id, original_name, is_favorite, deleted_at")
                .eq("id", req.params.fileId)
                .eq("user_id", req.user.id)
                .is("deleted_at", null)
                .maybeSingle();

            if (fileError) {

                console.error(
                    "FAVORITE FILE FIND ERROR:",
                    fileError
                );

                return res.status(400).json({
                    success: false,
                    message: fileError.message
                });
            }

            if (!file) {

                return res.status(404).json({
                    success: false,
                    message: "File not found."
                });
            }

            // Toggle favorite status
            const newFavoriteStatus = !file.is_favorite;

            const {
                data: updatedFile,
                error: updateError
            } = await adminSupabase
                .from("files")
                .update({
                    is_favorite: newFavoriteStatus
                })
                .eq("id", file.id)
                .eq("user_id", req.user.id)
                .select()
                .single();

            if (updateError) {

                console.error(
                    "FAVORITE UPDATE ERROR:",
                    updateError
                );

                return res.status(400).json({
                    success: false,
                    message: updateError.message
                });
            }

            console.log(
                newFavoriteStatus
                    ? `⭐ Added to Favorites: ${file.original_name}`
                    : `☆ Removed from Favorites: ${file.original_name}`
            );

            return res.json({
                success: true,

                message: newFavoriteStatus
                    ? "File added to Favorites."
                    : "File removed from Favorites.",

                file: updatedFile
            });

        } catch (err) {

            console.error(
                "TOGGLE FAVORITE ERROR:",
                err
            );

            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

    }
);

// =====================================================
// LIST FAVORITE FILES
// GET /api/favorites
// =====================================================

router.get(
    "/favorites",
    authenticateUser,
    async (req, res) => {

        try {

            console.log("⭐ FAVORITES ROUTE HIT");

            const userSupabase = getUserSupabase(req);

            const {
                data: files,
                error
            } = await userSupabase
                .from("files")
                .select("*")
                .eq("user_id", req.user.id)
                .eq("is_favorite", true)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });

            if (error) {

                console.error(
                    "LIST FAVORITES ERROR:",
                    error
                );

                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.json({
                success: true,
                files
            });

        } catch (err) {

            console.error(
                "FAVORITES ERROR:",
                err
            );

            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

    }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;