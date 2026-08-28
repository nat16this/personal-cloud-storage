const express = require("express");
const router = express.Router();

const { DropboxAuth } = require("dropbox");

const authenticateUser = require("../middleware/authMiddleware");
const supabaseAdmin = require("../config/supabaseAdmin");

const {
  getDropboxClient,
} = require("../services/dropboxService");

const {
  getDropboxClient,
  refreshDropboxClient,
} = require("../services/dropboxService");

const DROPBOX_CLIENT_ID =
  process.env.DROPBOX_APP_KEY;

const DROPBOX_CLIENT_SECRET =
  process.env.DROPBOX_APP_SECRET;

const DROPBOX_REDIRECT_URI =
  process.env.DROPBOX_REDIRECT_URI;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";


// ============================================================
// HELPER: IS DROPBOX 401?
// ============================================================

function isDropboxUnauthorized(error) {
  const status =
    error?.status ||
    error?.statusCode ||
    error?.response?.status;

  const message =
    error?.message ||
    error?.error?.error_summary ||
    "";

  return (
    Number(status) === 401 ||
    message.toLowerCase().includes("401") ||
    message
      .toLowerCase()
      .includes("expired_access_token") ||
    message
      .toLowerCase()
      .includes("invalid_access_token")
  );
}


// ============================================================
// DROPBOX CONNECT
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
        console.error(
          "Dropbox environment variables are missing."
        );

        return res.status(500).json({
          success: false,
          message:
            "Dropbox environment variables are not configured.",
        });
      }

      const userId = req.user.id;

      console.log(
        "=========================================="
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
        "=========================================="
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

      console.log(
        "Dropbox OAuth URL generated successfully."
      );

      return res.json({
        success: true,
        authUrl,
      });
    } catch (error) {
      console.error(
        "DROPBOX CONNECT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
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
      const {
        code,
        state,
      } = req.query;

      console.log(
        "=========================================="
      );

      console.log(
        "DROPBOX OAUTH CALLBACK"
      );

      console.log(
        "Code received:",
        Boolean(code)
      );

      console.log(
        "State received:",
        Boolean(state)
      );

      console.log(
        "=========================================="
      );

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
        "Dropbox token exchange completed."
      );

      const accessToken =
        tokenResult?.result?.access_token;

      const refreshToken =
        tokenResult?.result?.refresh_token;

      const expiresIn =
        tokenResult?.result?.expires_in;

      if (!accessToken) {
        throw new Error(
          "Dropbox did not return an access token."
        );
      }

      if (!refreshToken) {
        throw new Error(
          "Dropbox did not return a refresh token. Please reconnect Dropbox with offline access."
        );
      }

      const expiresAt = expiresIn
        ? new Date(
            Date.now() +
              Number(expiresIn) * 1000
          ).toISOString()
        : null;

      console.log(
        "Saving Dropbox connection for user:",
        userId
      );

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
          "DROPBOX CONNECTION SAVE ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Dropbox authorization succeeded but the connection could not be saved.",
          details: error.message,
        });
      }

      console.log(
        "Dropbox connection saved successfully."
      );

      /**
       * IMPORTANT:
       *
       * Redirect to the frontend URL, NOT the backend URL.
       *
       * In production FRONTEND_URL should be:
       *
       * https://personal-cloud-storage-frontend.onrender.com
       */
      const redirectUrl =
        `${FRONTEND_URL}/profile?dropbox=connected`;

      console.log(
        "Redirecting user to:",
        redirectUrl
      );

      return res.redirect(
        redirectUrl
      );
    } catch (error) {
      console.error(
        "=========================================="
      );

      console.error(
        "DROPBOX CALLBACK ERROR"
      );

      console.error(
        error?.error ||
          error?.message ||
          error
      );

      console.error(
        "=========================================="
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
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
        "=========================================="
      );

      console.log(
        "LIST DROPBOX FILES"
      );

      console.log(
        "User:",
        userId
      );

      console.log(
        "=========================================="
      );

      const {
        dbx,
        dbxAuth,
      } = await getDropboxClient(
        userId
      );

      let result;

      try {
        result =
          await dbx.filesListFolder({
            path: "",
          });
      } catch (error) {
        /**
         * If Dropbox says the access token is invalid,
         * refresh it once and retry.
         */
        if (
          isDropboxUnauthorized(error)
        ) {
          console.log(
            "Dropbox returned 401 while listing files."
          );

          const refreshedDbx =
            await refreshDropboxClient(
              userId,
              dbxAuth
            );

          result =
            await refreshedDbx.filesListFolder({
              path: "",
            });
        } else {
          throw error;
        }
      }

      const entries =
        result?.result?.entries || [];

      const files =
        entries
          .filter(
            (entry) =>
              entry[".tag"] ===
              "file"
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
        "Dropbox files loaded:",
        files.length
      );

      return res.json({
        success: true,
        files,
      });
    } catch (error) {
      console.error(
        "=========================================="
      );

      console.error(
        "DROPBOX FILE LIST ERROR"
      );

      console.error(
        "Message:",
        error?.message
      );

      console.error(
        "Status:",
        error?.status ||
          error?.statusCode
      );

      console.error(
        error?.error ||
          ""
      );

      console.error(
        "=========================================="
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
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
      const filePath =
        req.query.path;

      if (!filePath) {
        return res.status(400).json({
          success: false,
          message:
            "Dropbox file path is required.",
        });
      }

      const userId = req.user.id;

      console.log(
        "=========================================="
      );

      console.log(
        "DROPBOX VIEW FILE"
      );

      console.log(
        "User:",
        userId
      );

      console.log(
        "Path:",
        filePath
      );

      console.log(
        "=========================================="
      );

      const {
        dbx,
        dbxAuth,
      } = await getDropboxClient(
        userId
      );

      let result;

      try {
        console.log(
          "Calling Dropbox filesDownload..."
        );

        result =
          await dbx.filesDownload({
            path: filePath,
          });

        console.log(
          "Dropbox filesDownload succeeded."
        );
      } catch (error) {
        console.error(
          "First Dropbox download attempt failed."
        );

        console.error(
          "Status:",
          error?.status ||
            error?.statusCode
        );

        console.error(
          "Message:",
          error?.message
        );

        /**
         * THIS IS THE IMPORTANT FIX.
         *
         * Dropbox can return 401 even when our stored
         * expires_at value has not passed.
         *
         * Refresh the token and retry the download.
         */
        if (
          isDropboxUnauthorized(error)
        ) {
          console.log(
            "401 detected. Refreshing Dropbox token..."
          );

          const refreshedDbx =
            await refreshDropboxClient(
              userId,
              dbxAuth
            );

          console.log(
            "Retrying Dropbox download with refreshed token..."
          );

          result =
            await refreshedDbx.filesDownload({
              path: filePath,
            });

          console.log(
            "Dropbox download succeeded after token refresh."
          );
        } else {
          throw error;
        }
      }

      const file =
        result?.result;

      if (!file) {
        throw new Error(
          "Dropbox returned no file."
        );
      }

      const fileName =
        file.name ||
        "dropbox-file";

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

      /**
       * Dropbox's fileBinary can be a Uint8Array,
       * ArrayBuffer, or Buffer depending on the SDK/runtime.
       *
       * Convert it to a Node Buffer before sending.
       */
      let fileBuffer;

      if (
        Buffer.isBuffer(
          file.fileBinary
        )
      ) {
        fileBuffer =
          file.fileBinary;
      } else if (
        file.fileBinary instanceof
        Uint8Array
      ) {
        fileBuffer =
          Buffer.from(
            file.fileBinary
          );
      } else if (
        file.fileBinary instanceof
        ArrayBuffer
      ) {
        fileBuffer =
          Buffer.from(
            new Uint8Array(
              file.fileBinary
            )
          );
      } else {
        fileBuffer =
          Buffer.from(
            file.fileBinary
          );
      }

      console.log(
        "File downloaded from Dropbox:"
      );

      console.log(
        "Name:",
        fileName
      );

      console.log(
        "Type:",
        contentType
      );

      console.log(
        "Size:",
        fileBuffer.length
      );

      /**
       * Tell the browser to display the file.
       */
      res.setHeader(
        "Content-Type",
        contentType
      );

      res.setHeader(
        "Content-Length",
        fileBuffer.length
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName.replace(
          /"/g,
          ""
        )}"`
      );

      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
      );

      return res.end(
        fileBuffer
      );
    } catch (error) {
      console.error(
        "=========================================="
      );

      console.error(
        "DROPBOX VIEW FILE ERROR"
      );

      console.error(
        "Message:",
        error?.message
      );

      console.error(
        "Status:",
        error?.status ||
          error?.statusCode
      );

      console.error(
        "Dropbox error:",
        error?.error ||
          error?.response?.body ||
          ""
      );

      console.error(
        "=========================================="
      );

      /**
       * If Dropbox authorization is genuinely dead,
       * tell the frontend to reconnect.
       */
      if (
        isDropboxUnauthorized(error)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Dropbox authorization has expired. Please reconnect Dropbox.",
          reconnectRequired: true,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
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
      const filePath =
        req.query.path;

      if (!filePath) {
        return res.status(400).json({
          success: false,
          message:
            "Dropbox file path is required.",
        });
      }

      const userId =
        req.user.id;

      const {
        dbx,
        dbxAuth,
      } = await getDropboxClient(
        userId
      );

      let result;

      try {
        result =
          await dbx.filesDownload({
            path: filePath,
          });
      } catch (error) {
        if (
          isDropboxUnauthorized(error)
        ) {
          console.log(
            "401 during download. Refreshing token..."
          );

          const refreshedDbx =
            await refreshDropboxClient(
              userId,
              dbxAuth
            );

          result =
            await refreshedDbx.filesDownload({
              path: filePath,
            });
        } else {
          throw error;
        }
      }

      const file =
        result?.result;

      if (!file) {
        throw new Error(
          "Dropbox returned no file."
        );
      }

      const fileName =
        file.name ||
        "download";

      let fileBuffer;

      if (
        Buffer.isBuffer(
          file.fileBinary
        )
      ) {
        fileBuffer =
          file.fileBinary;
      } else if (
        file.fileBinary instanceof
        Uint8Array
      ) {
        fileBuffer =
          Buffer.from(
            file.fileBinary
          );
      } else if (
        file.fileBinary instanceof
        ArrayBuffer
      ) {
        fileBuffer =
          Buffer.from(
            new Uint8Array(
              file.fileBinary
            )
          );
      } else {
        fileBuffer =
          Buffer.from(
            file.fileBinary
          );
      }

      res.setHeader(
        "Content-Type",
        "application/octet-stream"
      );

      res.setHeader(
        "Content-Length",
        fileBuffer.length
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName.replace(
          /"/g,
          ""
        )}"`
      );

      res.setHeader(
        "Cache-Control",
        "no-store"
      );

      return res.end(
        fileBuffer
      );
    } catch (error) {
      console.error(
        "DROPBOX DOWNLOAD ERROR:",
        error
      );

      if (
        isDropboxUnauthorized(error)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Dropbox authorization has expired. Please reconnect Dropbox.",
          reconnectRequired: true,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Failed to download Dropbox file.",
      });
    }
  }
);


module.exports = router;