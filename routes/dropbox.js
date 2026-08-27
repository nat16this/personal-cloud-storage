const express = require("express");
const router = express.Router();

const { Dropbox, DropboxAuth } = require("dropbox");

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

    console.log("=================================");
    console.log("DROPBOX OAUTH START");
    console.log("User:", userId);
    console.log("=================================");

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
    console.error("Dropbox OAuth start error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to start Dropbox connection.",
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
        message: "No authorization code received from Dropbox.",
      });
    }

    if (!state) {
      return res.status(400).json({
        success: false,
        message: "No user information received from Dropbox.",
      });
    }

    const userId = state;

    console.log("=================================");
    console.log("DROPBOX CALLBACK");
    console.log("User:", userId);
    console.log("=================================");

    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    });

    const tokenResult =
      await dbxAuth.getAccessTokenFromCode(
        process.env.DROPBOX_REDIRECT_URI,
        code
      );

    const accessToken =
      tokenResult.result.access_token;

    const refreshToken =
      tokenResult.result.refresh_token;

    const expiresIn =
      tokenResult.result.expires_in;

    if (!accessToken) {
      throw new Error("Dropbox did not return an access token.");
    }

    if (!refreshToken) {
      throw new Error("Dropbox did not return a refresh token.");
    }

    const expiresAt = expiresIn
      ? new Date(
          Date.now() + expiresIn * 1000
        ).toISOString()
      : null;

    console.log("Access token received:", !!accessToken);
    console.log("Refresh token received:", !!refreshToken);
    console.log("Expires at:", expiresAt);


    // ========================================================
    // SAVE CONNECTION
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

    if (dbError) {
      console.error(
        "Supabase Dropbox save error:",
        dbError
      );

      return res.status(500).json({
        success: false,
        message:
          "Dropbox connected but failed to save connection.",
        details: dbError.message,
      });
    }

    console.log(
      "Dropbox connection saved:",
      !!savedConnection
    );


    // ========================================================
    // REDIRECT TO FRONTEND
    // ========================================================

return res.redirect(
  "http://localhost:5173/profile?dropbox=connected"
);

  } catch (error) {
    console.error(
      "Dropbox callback error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to complete Dropbox connection.",
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
        "Fetching Dropbox files for:",
        userId
      );

      const { dbx } =
        await getDropboxClient(userId);

      const result =
        await dbx.filesListFolder({
          path: "",
        });

      const entries =
        result.result.entries || [];

      const files = entries
        .filter(
          (entry) =>
            entry[".tag"] === "file"
        )
        .map((file) => ({
          id: file.id,
          name: file.name,
          path: file.path_display,
          size: file.size,
          modified:
            file.server_modified,
        }));

      console.log(
        "Dropbox files found:",
        files.length
      );

      res.json({
        success: true,
        files,
      });

    } catch (error) {
      console.error(
        "Dropbox files error:",
        error
      );

      res.status(500).json({
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

      const filePath = req.query.path;

      console.log(
        "================================="
      );

      console.log(
        "DROPBOX FILE REQUEST"
      );

      console.log(
        "User:",
        req.user.id
      );

      console.log(
        "Path:",
        filePath
      );

      console.log(
        "================================="
      );


      // --------------------------------------------------------
      // CHECK PATH
      // --------------------------------------------------------

      if (!filePath) {
        return res.status(400).json({
          success: false,
          message:
            "Dropbox file path is required.",
        });
      }


      // --------------------------------------------------------
      // GET DROPBOX CLIENT
      // --------------------------------------------------------

      const {
        dbx,
        connection,
      } = await getDropboxClient(
        req.user.id
      );


      console.log(
        "Dropbox connection found:",
        !!connection
      );


      // --------------------------------------------------------
      // DOWNLOAD FILE
      // --------------------------------------------------------

      const result =
        await dbx.filesDownload({
          path: filePath,
        });


      console.log(
        "Dropbox download successful."
      );


      const file =
        result.result;


      // --------------------------------------------------------
      // GET FILE BINARY
      // --------------------------------------------------------

      const fileBinary =
        file.fileBinary;


      if (!fileBinary) {
        throw new Error(
          "Dropbox returned no file data."
        );
      }


      // --------------------------------------------------------
      // DETERMINE CONTENT TYPE
      // --------------------------------------------------------

      const fileName =
        file.name ||
        filePath
          .split("/")
          .pop();


      const extension =
        fileName
          .split(".")
          .pop()
          .toLowerCase();


      const mimeTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",

        pdf: "application/pdf",

        mp4: "video/mp4",
        webm: "video/webm",

        mp3: "audio/mpeg",
        wav: "audio/wav",

        txt: "text/plain",

        json: "application/json",

        zip: "application/zip",
      };


      const contentType =
        mimeTypes[extension] ||
        "application/octet-stream";


      // --------------------------------------------------------
      // SEND FILE
      // --------------------------------------------------------

      res.setHeader(
        "Content-Type",
        contentType
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(
          fileName
        )}"`
      );

      res.setHeader(
        "Cache-Control",
        "no-store"
      );


      res.send(fileBinary);

    } catch (error) {

      console.error(
        "================================="
      );

      console.error(
        "DROPBOX FILE ERROR"
      );

      console.error(
        error
      );

      console.error(
        "================================="
      );


      res.status(500).json({
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