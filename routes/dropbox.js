const express = require("express");
const router = express.Router();

const { DropboxAuth } = require("dropbox");
const authenticateUser = require("../middleware/authMiddleware");
const supabaseAdmin = require("../config/supabaseAdmin");


// ============================================================
// STEP 1: Start Dropbox OAuth
// ============================================================

router.get("/connect", authenticateUser, async (req, res) => {
  try {
    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    });

    // Get the currently logged-in Supabase user
    const userId = req.user.id;

    console.log("Starting Dropbox OAuth for user:", userId);

    const authUrl = await dbxAuth.getAuthenticationUrl(
      process.env.DROPBOX_REDIRECT_URI,
      userId,
      "code",
      "offline"
    );

    // Send the Dropbox URL back to the frontend.
    // The frontend will then redirect the browser to Dropbox.
    res.json({
      success: true,
      authUrl,
    });

  } catch (error) {
    console.error("Dropbox OAuth error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to start Dropbox connection",
      details: error?.message || error,
    });
  }
});

// ============================================================
// STEP 2: Dropbox OAuth Callback
// ============================================================

router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    // Make sure Dropbox returned an authorization code
    if (!code) {
      return res.status(400).json({
        success: false,
        error: "No authorization code received from Dropbox",
      });
    }

    // Make sure we know which Supabase user started the OAuth flow
    if (!state) {
      return res.status(400).json({
        success: false,
        error: "No user information received from Dropbox",
      });
    }

    const userId = state;

    console.log("Dropbox OAuth callback received.");
    console.log("User ID:", userId);

    // Create Dropbox authentication client
    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    });

    // Exchange authorization code for Dropbox tokens
    const tokenResult = await dbxAuth.getAccessTokenFromCode(
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

    // Make sure we actually received the tokens
    if (!accessToken || !refreshToken) {
      return res.status(500).json({
        success: false,
        error: "Dropbox did not return the required tokens.",
      });
    }

    // Calculate expiration time
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // ========================================================
    // DEBUG INFORMATION
    // ========================================================

    console.log("===== DROPBOX SAVE DEBUG =====");
    console.log("User ID:", userId);
    console.log("Access token exists:", !!accessToken);
    console.log("Refresh token exists:", !!refreshToken);
    console.log("Expires at:", expiresAt);
    console.log(
      "Supabase URL exists:",
      !!process.env.SUPABASE_URL
    );
    console.log(
      "Service role key exists:",
      !!process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log("================================");


    // ========================================================
    // STEP 3: Save Dropbox connection to Supabase
    // ========================================================

    const { data: savedConnection, error: dbError } =
      await supabaseAdmin
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


    // ========================================================
    // Check database result
    // ========================================================

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
        error: "Dropbox connected but failed to save connection.",
        details: dbError.message,
      });
    }

console.log("================================");
console.log("DROPBOX CALLBACK SUCCESS");
console.log("User:", userId);
console.log("Redirecting to frontend...");
console.log("================================");

return res.redirect(
  "http://localhost:5173/profile?dropbox=connected"
);



// ============================================================
// SUCCESS
// ============================================================

console.log("Dropbox connected successfully for user:", userId);

res.redirect(
  "http://localhost:5173/profile?dropbox=connected"
);

  } catch (error) {

    console.error("Dropbox callback error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to complete Dropbox connection",
      details: error?.message || error,
    });
  }
});

// ============================================================
// STEP 4: List Dropbox files
// ============================================================

router.get("/files", authenticateUser, async (req, res) => {
  try {
    const { getDropboxClient } = require("../services/dropboxService");

    const userId = req.user.id;

    console.log("Fetching Dropbox files for user:", userId);

    const { dbx } = await getDropboxClient(userId);

    const result = await dbx.filesListFolder({
      path: "",
    });

    const files = result.result.entries
      .filter((entry) => entry[".tag"] === "file")
      .map((file) => ({
        id: file.id,
        name: file.name,
        path: file.path_display,
        size: file.size,
        modified: file.server_modified,
      }));

    res.json({
      success: true,
      files,
    });

  } catch (error) {
    console.error("Dropbox files error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to load Dropbox files.",
    });
  }
});


// ============================================================
// VIEW / DOWNLOAD A DROPBOX FILE
// ============================================================

router.get("/file", authenticateUser, async (req, res) => {
  try {
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: "Dropbox file path is required.",
      });
    }

    const { dbx } = await getDropboxClient(req.user.id);

    const result = await dbx.filesDownload({
      path,
    });

    const file = result.result;

    res.setHeader(
      "Content-Type",
      file.media_info?.metadata?.mime_type ||
      "application/octet-stream"
    );

    res.send(file.fileBinary);

  } catch (error) {
    console.error("Dropbox file error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve Dropbox file.",
    });
  }
});



module.exports = router;