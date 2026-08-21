const express = require("express");
const router = express.Router();

const { DropboxAuth } = require("dropbox");
const authenticateUser = require("../middleware/authMiddleware");
const supabaseAdmin = require("../config/supabaseAdmin");


// STEP 1: Start Dropbox OAuth
router.get("/connect", authenticateUser, async (req, res) => {
  try {
    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    });

    // Identify which Supabase user is connecting Dropbox
    const userId = req.user.id;

    const authUrl = await dbxAuth.getAuthenticationUrl(
      process.env.DROPBOX_REDIRECT_URI,
      userId,
      "code",
      "offline"
    );

    res.redirect(authUrl);

  } catch (error) {
    console.error("Dropbox OAuth error:", error);

    res.status(500).json({
      error: "Failed to start Dropbox connection",
      details: error?.message || error,
    });
  }
});


// STEP 2: Dropbox sends the user back here
router.get("/callback", async (req, res) => {
  try {

    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        error: "No authorization code received from Dropbox",
      });
    }

    if (!state) {
      return res.status(400).json({
        error: "No user information received from Dropbox",
      });
    }

    const userId = state;

    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    });

    const tokenResult = await dbxAuth.getAccessTokenFromCode(
      process.env.DROPBOX_REDIRECT_URI,
      code
    );

    const accessToken = tokenResult.result.access_token;
    const refreshToken = tokenResult.result.refresh_token;
    const expiresIn = tokenResult.result.expires_in;

    console.log("✅ Dropbox connected successfully!");
    console.log("User:", userId);
    console.log("Access token received:", !!accessToken);
    console.log("Refresh token received:", !!refreshToken);

    // Calculate token expiration
    const expiresAt = new Date(
      Date.now() + expiresIn * 1000
    ).toISOString();


    // Save Dropbox connection
    const { error: dbError } = await supabaseAdmin
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
      );


    if (dbError) {
      console.error("Supabase Dropbox save error:", dbError);

      return res.status(500).json({
        error: "Dropbox connected but failed to save connection.",
        details: dbError.message,
      });
    }


    res.json({
      success: true,
      message: "Dropbox connected and saved successfully!",
    });

  } catch (error) {

    console.error("Dropbox callback error:", error);

    res.status(500).json({
      error: "Failed to complete Dropbox connection",
      details: error?.message || error,
    });
  }
});


module.exports = router;