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