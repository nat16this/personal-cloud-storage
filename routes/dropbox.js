const express = require("express");
const router = express.Router();

const { DropboxAuth } = require("dropbox");

// STEP 1: Start Dropbox OAuth
router.get("/connect", async (req, res) => {
  try {
    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    });

    const authUrl = await dbxAuth.getAuthenticationUrl(
      process.env.DROPBOX_REDIRECT_URI,
      undefined,
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
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        error: "No authorization code received from Dropbox",
      });
    }

    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    });

    const tokenResult = await dbxAuth.getAccessTokenFromCode(
      process.env.DROPBOX_REDIRECT_URI,
      code
    );

    console.log("✅ Dropbox connected successfully!");

    console.log("Access token received:", !!tokenResult.result.access_token);
    console.log("Refresh token received:", !!tokenResult.result.refresh_token);

    res.json({
      success: true,
      message: "Dropbox connected successfully!",
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