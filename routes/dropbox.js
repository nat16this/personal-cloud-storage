const express = require("express");
const router = express.Router();

const { DropboxAuth } = require("dropbox");

const authenticateUser = require("../middleware/authMiddleware");
const supabaseAdmin = require("../config/supabaseAdmin");

// IMPORTANT:
// getDropboxClient comes ONLY from the service.
// Do NOT define another getDropboxClient in this file.
const {
  getDropboxClient,
} = require("../services/dropboxService");

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

const DROPBOX_CLIENT_ID =
  process.env.DROPBOX_APP_KEY;

const DROPBOX_CLIENT_SECRET =
  process.env.DROPBOX_APP_SECRET;

const DROPBOX_REDIRECT_URI =
  process.env.DROPBOX_REDIRECT_URI;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

console.log("================================");
console.log("FRONTEND_URL BEING USED:", FRONTEND_URL);
console.log("================================");
// ============================================================
// CHECK DROPBOX CONFIGURATION
// ============================================================

function checkDropboxConfig() {
  if (!DROPBOX_CLIENT_ID) {
    throw new Error(
      "DROPBOX_APP_KEY is missing."
    );
  }

  if (!DROPBOX_CLIENT_SECRET) {
    throw new Error(
      "DROPBOX_APP_SECRET is missing."
    );
  }

  if (!DROPBOX_REDIRECT_URI) {
    throw new Error(
      "DROPBOX_REDIRECT_URI is missing."
    );
  }
}

// ============================================================
// CONNECT DROPBOX
// ============================================================

router.get(
  "/connect",
  authenticateUser,
  async (req, res) => {
    try {
      checkDropboxConfig();

      const userId = req.user.id;

      console.log(
        "================================"
      );

      console.log(
        "STARTING DROPBOX OAUTH"
      );

      console.log(
        "User:",
        userId
      );

      console.log(
        "Redirect URI:",
        DROPBOX_REDIRECT_URI
      );

      console.log(
        "================================"
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
    "offline",
    [
      "files.metadata.read",
      "files.content.read"
    ],
    "user"
  );
  
      console.log(
        "Dropbox authorization URL created."
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
      checkDropboxConfig();

      const { code, state, error } =
        req.query;

      console.log(
        "================================"
      );

      console.log(
        "DROPBOX OAUTH CALLBACK"
      );

      console.log(
        "Code received:",
        !!code
      );

      console.log(
        "State received:",
        !!state
      );

      console.log(
        "================================"
      );

      // --------------------------------------------------------
      // DROPBOX RETURNED AN ERROR
      // --------------------------------------------------------

      if (error) {
        console.error(
          "Dropbox OAuth error:",
          error
        );

        return res.redirect(
          `${FRONTEND_URL}/profile?dropbox=error&message=${encodeURIComponent(
            error
          )}`
        );
      }

      // --------------------------------------------------------
      // CHECK CODE
      // --------------------------------------------------------

      if (!code) {
        return res.status(400).json({
          success: false,
          message:
            "No authorization code received from Dropbox.",
        });
      }

      // --------------------------------------------------------
      // CHECK STATE
      // --------------------------------------------------------

      if (!state) {
        return res.status(400).json({
          success: false,
          message:
            "No user information received from Dropbox.",
        });
      }

      const userId = state;

      console.log(
        "Dropbox OAuth user:",
        userId
      );

      // --------------------------------------------------------
      // EXCHANGE CODE FOR TOKENS
      // --------------------------------------------------------

      const dbxAuth = new DropboxAuth({
        clientId: DROPBOX_CLIENT_ID,
        clientSecret: DROPBOX_CLIENT_SECRET,
      });

      const tokenResult =
        await dbxAuth.getAccessTokenFromCode(
          DROPBOX_REDIRECT_URI,
          code
        );

      console.log(
        "Dropbox token exchange successful."
      );

      const result =
        tokenResult.result;

      const accessToken =
        result.access_token;

      const refreshToken =
        result.refresh_token;

      const expiresIn =
        result.expires_in;

      if (!accessToken) {
        throw new Error(
          "Dropbox did not return an access token."
        );
      }

      // --------------------------------------------------------
      // CALCULATE EXPIRATION
      // --------------------------------------------------------

      const expiresAt = expiresIn
        ? new Date(
            Date.now() +
              Number(expiresIn) * 1000
          ).toISOString()
        : null;

      console.log(
        "Access token received:",
        !!accessToken
      );

      console.log(
        "Refresh token received:",
        !!refreshToken
      );

      console.log(
        "Expires at:",
        expiresAt
      );

      // --------------------------------------------------------
      // SAVE CONNECTION
      // --------------------------------------------------------

      const { error: saveError } =
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

      if (saveError) {
        console.error(
          "Failed to save Dropbox connection:",
          saveError
        );

        return res.status(500).json({
          success: false,
          message:
            "Dropbox authorization succeeded, but the connection could not be saved.",
          details:
            saveError.message,
        });
      }

      console.log(
        "Dropbox connection saved successfully."
      );

      // --------------------------------------------------------
      // RETURN TO FRONTEND
      // --------------------------------------------------------

      return res.redirect(
        `${FRONTEND_URL}/profile?dropbox=connected`
      );
    } catch (error) {
      console.error(
        "================================"
      );

      console.error(
        "DROPBOX CALLBACK ERROR"
      );

      console.error(
        error
      );

      console.error(
        "================================"
      );

      return res.redirect(
        `${FRONTEND_URL}/profile?dropbox=error&message=${encodeURIComponent(
          error.message ||
            "Dropbox connection failed."
        )}`
      );
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
        "================================"
      );

      console.log(
        "FETCHING DROPBOX FILES"
      );

      console.log(
        "User:",
        userId
      );

      console.log(
        "================================"
      );

      const { dbx } =
        await getDropboxClient(userId);

      const result =
        await dbx.filesListFolder({
          path: "",
        });

      const entries =
        result.result.entries || [];

      const files =
        entries
          .filter(
            (entry) =>
              entry[".tag"] === "file"
          )
          .map((file) => ({
            id: file.id,
            name: file.name,
            path:
              file.path_display ||
              file.path_lower,
            size: file.size,
            modified:
              file.server_modified,
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

      // --------------------------------------------------------
      // GET REFRESHED DROPBOX CLIENT
      // --------------------------------------------------------

      const { dbx } =
        await getDropboxClient(userId);

      console.log(
        "Calling Dropbox filesDownload..."
      );

      // --------------------------------------------------------
      // DOWNLOAD FILE FROM DROPBOX
      // --------------------------------------------------------

      const result =
        await dbx.filesDownload({
          path,
        });

      const file =
        result.result;

      if (!file) {
        throw new Error(
          "Dropbox returned no file."
        );
      }

      const fileName =
        file.name || "file";

      // --------------------------------------------------------
      // MIME TYPE
      // --------------------------------------------------------

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
        csv: "text/csv",

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

      // --------------------------------------------------------
      // RESPONSE HEADERS
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

      console.log(
        "Sending Dropbox file:",
        fileName
      );

      // --------------------------------------------------------
      // SEND FILE
      // --------------------------------------------------------

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
        "Error:",
        error
      );

      console.error(
        "================================"
      );

      // --------------------------------------------------------
      // BETTER ERROR FOR DROPBOX 401
      // --------------------------------------------------------

      if (
        error.status === 401 ||
        error.statusCode === 401
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Dropbox authorization is no longer valid. Please reconnect Dropbox.",
        });
      }

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

      const file =
        result.result;

      if (!file) {
        throw new Error(
          "Dropbox returned no file."
        );
      }

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

      if (
        error.status === 401 ||
        error.statusCode === 401
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Dropbox authorization is no longer valid. Please reconnect Dropbox.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to download Dropbox file.",
      });
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;