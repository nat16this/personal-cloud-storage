const express = require("express");
const { Dropbox, DropboxAuth } = require("dropbox");

const router = express.Router();

// Start Dropbox OAuth
router.get("/connect", (req, res) => {
  try {
    const dbxAuth = new DropboxAuth({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
    });

    const authUrl = dbxAuth.getAuthenticationUrl(
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
    });
  }
});

// Dropbox OAuth callback
router.get("/callback", async (req, res) => {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({
        error,
        message: error_description || "Dropbox authorization failed",
      });
    }

    if (!code) {
      return res.status(400).json({
        error: "No authorization code received",
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

    console.log("Dropbox connected successfully");

    res.json({
      connected: true,
      message: "Dropbox connected successfully",
      accountId: tokenResult.result.account_id,
    });
  } catch (error) {
    console.error(
      "Dropbox callback error:",
      error?.error || error?.message || error
    );

    res.status(500).json({
      error: "Failed to complete Dropbox connection",
    });
  }
});

module.exports = router;