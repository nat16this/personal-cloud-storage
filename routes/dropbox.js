const express = require("express");
const router = express.Router();

const { DropboxAuth } = require("dropbox");

const authenticateUser = require("../middleware/authMiddleware");
const supabaseAdmin = require("../config/supabaseAdmin");
const { getDropboxClient } = require("../services/dropboxService");

// ============================================================
// STEP 1: START DROPBOX OAUTH
// ============================================================

router.get("/connect", authenticateUser, async (req, res) => {
  try {
    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    });

    const userId = req.user.id;

    console.log("Starting Dropbox OAuth for user:", userId);

    const authUrl = await dbxAuth.getAuthenticationUrl(
      process.env.DROPBOX_REDIRECT_URI,
      userId,
      "code",
      "offline"
    );

    res.json({
      success: true,
      authUrl,
    });

  } catch (error) {
    console.error("Dropbox OAuth error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to start Dropbox connection",
      details: error.message || String(error),
    });
  }
});

// ============================================================
// STEP 2: DROPBOX OAUTH CALLBACK
// ============================================================

router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "No authorization code received from Dropbox",
      });
    }

    if (!state) {
      return res.status(400).json({
        success: false,
        error: "No user information received from Dropbox",
      });
    }

    const userId = state;

    console.log("Dropbox OAuth callback received.");
    console.log("User ID:", userId);

    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    });

    const tokenResult =
      await dbxAuth.getAccessTokenFromCode(
        process.env.DROPBOX_REDIRECT_URI,
        code
      );

    const accessToken = tokenResult.result.access_token;
    const refreshToken = tokenResult.result.refresh_token;
    const expiresIn = tokenResult.result.expires_in;

    console.log("Dropbox authorization successful.");
    console.log("Access token received:", !!accessToken);
    console.log("Refresh token received:", !!refreshToken);
    console.log("Expires in:", expiresIn);

    if (!accessToken || !refreshToken) {
      return res.status(500).json({
        success: false,
        error: "Dropbox did not return the required tokens.",
      });
    }

    const expiresAt = expiresIn
      ? new Date(
          Date.now() + expiresIn * 1000
        ).toISOString()
      : null;

    // ========================================================
    // SAVE DROPBOX CONNECTION
    // ========================================================

    const {
      data: savedConnection,
      error: dbError,
    } = await supabaseAdmin
      .from("dropbox_connections")
      .upsert(
        {
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    console.log("===== SUPABASE SAVE RESULT =====");
    console.log("Saved connection:", !!savedConnection);
    console.log("Database error:", dbError);
    console.log("================================");

    if (dbError) {
      console.error(
        "Supabase Dropbox save error:",
        dbError
      );

      return res.status(500).json({
        success: false,
        error:
          "Dropbox connected but failed to save connection.",
        details: dbError.message,
      });
    }

    console.log(
      "Dropbox connected successfully for user:",
      userId
    );

    // IMPORTANT:
    // Send the user back to the frontend after OAuth.
    return res.redirect(
      "http://localhost:5173/profile?dropbox=connected"
    );

  } catch (error) {
    console.error("Dropbox callback error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to complete Dropbox connection",
      details: error.message || String(error),
    });
  }
});

// ============================================================
// STEP 3: LIST DROPBOX FILES
// ============================================================

router.get(
  "/files",
  authenticateUser,
  async (req, res) => {
    try {
      const userId = req.user.id;

      console.log(
        "Fetching Dropbox files for user:",
        userId
      );

      const { dbx } =
        await getDropboxClient(userId);

      const result =
        await dbx.filesListFolder({
          path: "",
        });

      const files =
        result.result.entries
          .filter(
            (entry) =>
              entry[".tag"] === "file"
          )
          .map((file) => ({
            id: file.id,
            name: file.name,
            path: file.path_display,
            size: file.size,
            modified: file.server_modified,
          }));

      console.log(
        "Dropbox files found:",
        files.length
      );

      return res.json({
        success: true,
        files,
      });

    } catch (error) {
      console.error(
        "Dropbox files error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to load Dropbox files.",
      });
    }
  }
);

// ============================================================
// STEP 4: VIEW / DOWNLOAD DROPBOX FILE
// ============================================================

router.get(
  "/file",
  authenticateUser,
  async (req, res) => {
    try {
      const { path } = req.query;

      if (!path) {
        return res.status(400).json({
          success: false,
          message:
            "Dropbox file path is required.",
        });
      }

      const userId = req.user.id;

      console.log(
        "Opening Dropbox file:",
        path
      );

      // THIS WAS THE MISSING PART IN YOUR CODE.
      const { dbx } =
        await getDropboxClient(userId);

      const result =
        await dbx.filesDownload({
          path,
        });

      const file = result.result;

      console.log(
        "Dropbox file downloaded:",
        file.name
      );

      // ======================================================
      // DETERMINE CONTENT TYPE
      // ======================================================

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase();

      const mimeTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        bmp: "image/bmp",
        svg: "image/svg+xml",

        pdf: "application/pdf",

        mp4: "video/mp4",
        webm: "video/webm",
        mov: "video/quicktime",

        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",

        txt: "text/plain",

        json: "application/json",

        doc: "application/msword",
        docx:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        xls: "application/vnd.ms-excel",
        xlsx:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };

      const contentType =
        mimeTypes[extension] ||
        "application/octet-stream";

      res.setHeader(
        "Content-Type",
        contentType
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${file.name}"`
      );

      // Dropbox SDK returns the binary data here.
      return res.send(file.fileBinary);

    } catch (error) {
      console.error(
        "Dropbox file error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to retrieve Dropbox file.",
      });
    }
  }
);

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;