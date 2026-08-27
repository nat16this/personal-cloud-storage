const express = require("express");
const router = express.Router();

const { Dropbox, DropboxAuth } = require("dropbox");

const authenticateUser = require("../middleware/authMiddleware");
const supabaseAdmin = require("../config/supabaseAdmin");

const DROPBOX_CLIENT_ID = process.env.DROPBOX_APP_KEY;
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_APP_SECRET;
const DROPBOX_REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI;


// ============================================================
// GET DROPBOX CLIENT
// ============================================================

async function getDropboxClient(userId) {
  if (!userId) {
    throw new Error("Dropbox client requires a user ID.");
  }

  const { data: connection, error } = await supabaseAdmin
    .from("dropbox_connections")
    .select(
      "user_id, access_token, refresh_token, expires_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to read Dropbox connection: ${error.message}`
    );
  }

  if (!connection) {
    throw new Error(
      "No Dropbox connection found. Please reconnect Dropbox."
    );
  }

  if (!connection.refresh_token) {
    throw new Error(
      "Dropbox refresh token is missing. Please reconnect Dropbox."
    );
  }

  console.log("Dropbox connection found.");
  console.log(
    "Access token exists:",
    !!connection.access_token
  );
  console.log(
    "Refresh token exists:",
    !!connection.refresh_token
  );
  console.log(
    "Expires at:",
    connection.expires_at
  );

  const dbxAuth = new DropboxAuth({
    clientId: DROPBOX_CLIENT_ID,
    clientSecret: DROPBOX_CLIENT_SECRET,
    accessToken: connection.access_token,
    refreshToken: connection.refresh_token,
    accessTokenExpiresAt: connection.expires_at
      ? new Date(connection.expires_at)
      : undefined,
  });

  try {
    await dbxAuth.checkAndRefreshAccessToken();

    console.log(
      "Dropbox access token checked/refreshed successfully."
    );
  } catch (error) {
    console.error(
      "Dropbox token refresh failed:",
      error
    );

    throw new Error(
      "Dropbox authorization has expired or been revoked. Please reconnect Dropbox."
    );
  }

  const accessToken = dbxAuth.getAccessToken();
  const refreshToken = dbxAuth.getRefreshToken();
  const expiresAt = dbxAuth.getAccessTokenExpiresAt();

  if (!accessToken) {
    throw new Error(
      "Dropbox did not provide a valid access token."
    );
  }

  const updateData = {
    access_token: accessToken,
    updated_at: new Date().toISOString(),
  };

  if (refreshToken) {
    updateData.refresh_token = refreshToken;
  }

  if (expiresAt) {
    updateData.expires_at = new Date(
      expiresAt
    ).toISOString();
  }

  const { error: updateError } = await supabaseAdmin
    .from("dropbox_connections")
    .update(updateData)
    .eq("user_id", userId);

  if (updateError) {
    console.error(
      "Warning: failed to save refreshed Dropbox token:",
      updateError
    );
  }

  const dbx = new Dropbox({
    auth: dbxAuth,
  });

  return {
    dbx,
    dbxAuth,
  };
}


// ============================================================
// DROPBOX OAUTH CONNECT
// ============================================================

router.get(
  "/connect",
  authenticateUser,
  async (req, res) => {
    try {
      if (
        !DROPBOX_CLIENT_ID ||
        !DROPBOX_CLIENT_SECRET ||
        !DROPBOX_REDIRECT_URI
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Dropbox environment variables are not configured.",
        });
      }

      const userId = req.user.id;

      console.log(
        "Starting Dropbox OAuth for user:",
        userId
      );

      const dbxAuth = new DropboxAuth({
        clientId: DROPBOX_CLIENT_ID,
        clientSecret: DROPBOX_CLIENT_SECRET,
      });

      const authUrl =
        await dbxAuth.getAuthenticationUrl(
          DROPBOX_REDIRECT_URI,
          userId,
          "code",
          "offline"
        );

      return res.json({
        success: true,
        authUrl,
      });
    } catch (error) {
      console.error(
        "Dropbox OAuth start error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to start Dropbox connection.",
      });
    }
  }
);


// ============================================================
// DROPBOX OAUTH CALLBACK
// ============================================================

router.get(
  "/callback",
  async (req, res) => {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          message:
            "No authorization code received from Dropbox.",
        });
      }

      if (!state) {
        return res.status(400).json({
          success: false,
          message:
            "No user information received from Dropbox.",
        });
      }

      const userId = state;

      console.log(
        "Dropbox OAuth callback received."
      );

      console.log(
        "User ID:",
        userId
      );

      const dbxAuth = new DropboxAuth({
        clientId: DROPBOX_CLIENT_ID,
        clientSecret: DROPBOX_CLIENT_SECRET,
      });

      const tokenResult =
        await dbxAuth.getAccessTokenFromCode(
          DROPBOX_REDIRECT_URI,
          code
        );

      const accessToken =
        tokenResult.result.access_token;

      const refreshToken =
        tokenResult.result.refresh_token;

      const expiresIn =
        tokenResult.result.expires_in;

      if (!accessToken) {
        return res.status(500).json({
          success: false,
          message:
            "Dropbox did not return an access token.",
        });
      }

      const expiresAt = expiresIn
        ? new Date(
            Date.now() + expiresIn * 1000
          ).toISOString()
        : null;

      const { error } =
        await supabaseAdmin
          .from("dropbox_connections")
          .upsert(
            {
              user_id: userId,
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: expiresAt,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            }
          );

      if (error) {
        console.error(
          "Failed to save Dropbox connection:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Dropbox connected but failed to save the connection.",
          details: error.message,
        });
      }

      console.log(
        "Dropbox connection saved successfully."
      );

      return res.redirect(
        "http://localhost:5173/profile?dropbox=connected"
      );
    } catch (error) {
      console.error(
        "Dropbox callback error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to complete Dropbox connection.",
      });
    }
  }
);


// ============================================================
// LIST DROPBOX FILES
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
            modified:
              file.server_modified,
          }));

      console.log(
        "Dropbox files loaded:",
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
// VIEW DROPBOX FILE
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
        "================================"
      );

      console.log(
        "DROPBOX FILE REQUEST"
      );

      console.log(
        "User:",
        userId
      );

      console.log(
        "Path:",
        path
      );

      console.log(
        "================================"
      );

      const { dbx } =
        await getDropboxClient(userId);

      console.log(
        "Calling Dropbox filesDownload..."
      );

      const result =
        await dbx.filesDownload({
          path,
        });

      const file = result.result;

      if (!file) {
        throw new Error(
          "Dropbox returned no file."
        );
      }

      const fileName =
        file.name || "file";

      const extension =
        fileName
          .split(".")
          .pop()
          .toLowerCase();

      const mimeTypes = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",

        pdf: "application/pdf",

        txt: "text/plain",

        mp4: "video/mp4",
        webm: "video/webm",
        mov: "video/quicktime",

        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",

        json: "application/json",

        zip: "application/zip",

        doc: "application/msword",

        docx:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        xls:
          "application/vnd.ms-excel",

        xlsx:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        ppt:
          "application/vnd.ms-powerpoint",

        pptx:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
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
        `inline; filename="${encodeURIComponent(
          fileName
        )}"`
      );

      res.setHeader(
        "Cache-Control",
        "no-store"
      );

      console.log(
        "Sending Dropbox file:",
        fileName
      );

      return res.send(
        file.fileBinary
      );
    } catch (error) {
      console.error(
        "================================"
      );

      console.error(
        "DROPBOX FILE ERROR"
      );

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "Status:",
        error.status
      );

      console.error(
        "================================"
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
// DOWNLOAD DROPBOX FILE
// ============================================================

router.get(
  "/download",
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

      const { dbx } =
        await getDropboxClient(userId);

      const result =
        await dbx.filesDownload({
          path,
        });

      const file = result.result;

      const fileName =
        file.name || "download";

      res.setHeader(
        "Content-Type",
        "application/octet-stream"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(
          fileName
        )}"`
      );

      res.setHeader(
        "Cache-Control",
        "no-store"
      );

      return res.send(
        file.fileBinary
      );
    } catch (error) {
      console.error(
        "Dropbox download error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to download Dropbox file.",
      });
    }
  }
);


module.exports = router;