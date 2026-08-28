import { useEffect, useState } from "react";

const API_URL =
  "https://personal-cloud-storage-1-r52f.onrender.com";

export default function Profile() {
  // ============================================================
  // PROFILE STATE
  // ============================================================

  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ============================================================
  // DROPBOX STATE
  // ============================================================

  const [dropboxConnected, setDropboxConnected] =
    useState(false);

  const [dropboxFiles, setDropboxFiles] = useState([]);

  const [dropboxLoading, setDropboxLoading] =
    useState(false);

  const [openingFile, setOpeningFile] =
    useState(null);

  // ============================================================
  // GET ACCESS TOKEN
  // ============================================================

  const getAccessToken = () => {
    try {
      // --------------------------------------------------------
      // First try the application's token key.
      // --------------------------------------------------------

      const directToken =
        localStorage.getItem("token");

      if (directToken) {
        return directToken;
      }

      // --------------------------------------------------------
      // Then try the stored Supabase session.
      // --------------------------------------------------------

      const sessionString =
        localStorage.getItem("session");

      if (!sessionString) {
        return null;
      }

      const session =
        JSON.parse(sessionString);

      if (session?.access_token) {
        return session.access_token;
      }

      if (session?.session?.access_token) {
        return session.session.access_token;
      }

      return null;
    } catch (error) {
      console.error(
        "ACCESS TOKEN ERROR:",
        error
      );

      return null;
    }
  };

  // ============================================================
  // FETCH PROFILE
  // ============================================================

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        getAccessToken();

      console.log(
        "PROFILE AUTH TOKEN:",
        token ? "FOUND" : "NOT FOUND"
      );

      if (!token) {
        setError(
          "You are not logged in. Please log in again."
        );

        return;
      }

      console.log(
        "Loading profile..."
      );

      const response =
        await fetch(
          `${API_URL}/api/profile`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
              Accept:
                "application/json",
            },
          }
        );

      let data = null;

      try {
        data =
          await response.json();
      } catch (jsonError) {
        console.error(
          "PROFILE JSON ERROR:",
          jsonError
        );
      }

      console.log(
        "PROFILE RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
          `Failed to load profile (${response.status}).`
        );
      }

      if (!data?.profile) {
        throw new Error(
          "The server did not return profile information."
        );
      }

      setProfile(
        data.profile
      );

      setDisplayName(
        data.profile.display_name ||
        ""
      );

    } catch (error) {
      console.error(
        "PROFILE LOAD ERROR:",
        error
      );

      setError(
        error?.message ||
        "Failed to load profile."
      );

    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UPDATE PROFILE
  // ============================================================

  const updateProfile = async (
    event
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const token =
        getAccessToken();

      if (!token) {
        setError(
          "You are not logged in. Please log in again."
        );

        return;
      }

      const response =
        await fetch(
          `${API_URL}/api/profile`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              display_name:
                displayName.trim(),
            }),
          }
        );

      let data = null;

      try {
        data =
          await response.json();
      } catch (jsonError) {
        console.error(
          "PROFILE UPDATE JSON ERROR:",
          jsonError
        );
      }

      console.log(
        "PROFILE UPDATE RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
          `Failed to update profile (${response.status}).`
        );
      }

      if (data?.profile) {
        setProfile(
          data.profile
        );

        setDisplayName(
          data.profile.display_name ||
          ""
        );
      }

      setMessage(
        "Profile updated successfully!"
      );

    } catch (error) {
      console.error(
        "PROFILE UPDATE ERROR:",
        error
      );

      setError(
        error?.message ||
        "Failed to update profile."
      );

    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CONNECT DROPBOX
  // ============================================================

  const connectDropbox = async () => {
    try {
      setMessage("");
      setError("");

      const token =
        getAccessToken();

      console.log(
        "DROPBOX CONNECT TOKEN:",
        token ? "FOUND" : "NOT FOUND"
      );

      if (!token) {
        setError(
          "You are not logged in. Please log in again."
        );

        return;
      }

      setMessage(
        "Starting Dropbox connection..."
      );

      console.log(
        "Starting Dropbox OAuth..."
      );

      const response =
        await fetch(
          `${API_URL}/api/dropbox/connect`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,

              Accept:
                "application/json",
            },
          }
        );

      let data = null;

      try {
        data =
          await response.json();
      } catch (jsonError) {
        console.error(
          "DROPBOX CONNECT JSON ERROR:",
          jsonError
        );
      }

      console.log(
        "DROPBOX CONNECT RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          `Dropbox connection failed (${response.status}).`
        );
      }

      if (
        !data?.success ||
        !data?.authUrl
      ) {
        throw new Error(
          data?.message ||
          data?.error ||
          "Dropbox authorization URL was not returned."
        );
      }

      console.log(
        "Redirecting to Dropbox..."
      );

      // --------------------------------------------------------
      // IMPORTANT:
      //
      // The backend supplies the Dropbox authorization URL.
      // We redirect directly to it.
      //
      // We DO NOT manually redirect to:
      // /profile?dropbox=connected
      // --------------------------------------------------------

      window.location.href =
        data.authUrl;

    } catch (error) {
      console.error(
        "DROPBOX CONNECT ERROR:",
        error
      );

      setError(
        error?.message ||
        "Failed to connect Dropbox."
      );
    }
  };

  // ============================================================
  // FETCH DROPBOX FILES
  // ============================================================

  const fetchDropboxFiles = async () => {
    try {
      setDropboxLoading(true);
      setMessage("");
      setError("");

      const token =
        getAccessToken();

      console.log(
        "DROPBOX FILES TOKEN:",
        token ? "FOUND" : "NOT FOUND"
      );

      if (!token) {
        setError(
          "You are not logged in. Please log in again."
        );

        return;
      }

      console.log(
        "Fetching Dropbox files..."
      );

      const response =
        await fetch(
          `${API_URL}/api/dropbox/files`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,

              Accept:
                "application/json",
            },
          }
        );

      let data = null;

      try {
        data =
          await response.json();
      } catch (jsonError) {
        console.error(
          "DROPBOX FILES JSON ERROR:",
          jsonError
        );
      }

      console.log(
        "DROPBOX FILES RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
          `Failed to load Dropbox files (${response.status}).`
        );
      }

      const files =
        Array.isArray(data?.files)
          ? data.files
          : [];

      setDropboxFiles(
        files
      );

      setDropboxConnected(
        true
      );

      console.log(
        "Dropbox files loaded:",
        files
      );

      setMessage(
        `Dropbox connected. Found ${files.length} file(s).`
      );

    } catch (error) {
      console.error(
        "DROPBOX FILES ERROR:",
        error
      );

      setError(
        error?.message ||
        "Failed to load Dropbox files."
      );

    } finally {
      setDropboxLoading(false);
    }
  };

  // ============================================================
  // VIEW DROPBOX FILE
  // ============================================================

  const viewDropboxFile = async (
    file
  ) => {
    try {
      setMessage("");
      setError("");

      const token =
        getAccessToken();

      console.log(
        "DROPBOX VIEW TOKEN:",
        token ? "FOUND" : "NOT FOUND"
      );

      if (!token) {
        setError(
          "You are not logged in. Please log in again."
        );

        return;
      }

      // --------------------------------------------------------
      // Get Dropbox path.
      // --------------------------------------------------------

      const path =
        typeof file === "string"
          ? file
          : file?.path;

      if (!path) {
        throw new Error(
          "Dropbox file path is missing."
        );
      }

      const fileName =
        typeof file === "object" &&
        file?.name
          ? file.name
          : path.split("/").pop();

      console.log(
        "================================"
      );

      console.log(
        "Opening Dropbox file:",
        fileName
      );

      console.log(
        "Dropbox path:",
        path
      );

      console.log(
        "================================"
      );

      setOpeningFile(
        path
      );

      // --------------------------------------------------------
      // Build request.
      // --------------------------------------------------------

      const url =
        `${API_URL}/api/dropbox/file?path=` +
        encodeURIComponent(path);

      console.log(
        "DROPBOX FILE REQUEST:",
        url
      );

      // --------------------------------------------------------
      // Request actual file from backend.
      // --------------------------------------------------------

      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      console.log(
        "DROPBOX FILE STATUS:",
        response.status
      );

      console.log(
        "DROPBOX FILE CONTENT TYPE:",
        response.headers.get(
          "content-type"
        )
      );

      // --------------------------------------------------------
      // Handle backend errors.
      // --------------------------------------------------------

      if (!response.ok) {
        let errorMessage =
          `Dropbox file request failed with status ${response.status}.`;

        try {
          const errorData =
            await response.json();

          console.log(
            "DROPBOX FILE ERROR RESPONSE:",
            errorData
          );

          if (
            errorData?.message
          ) {
            errorMessage =
              errorData.message;
          }
        } catch (jsonError) {
          console.warn(
            "Dropbox error response was not JSON."
          );
        }

        throw new Error(
          errorMessage
        );
      }

      // --------------------------------------------------------
      // Get the actual file as a Blob.
      // --------------------------------------------------------

      const blob =
        await response.blob();

      console.log(
        "DROPBOX BLOB TYPE:",
        blob.type
      );

      console.log(
        "DROPBOX BLOB SIZE:",
        blob.size
      );

      if (
        !blob ||
        blob.size === 0
      ) {
        throw new Error(
          "Dropbox returned an empty file."
        );
      }

      // --------------------------------------------------------
      // Determine content type.
      //
      // If the backend supplied a valid content type,
      // use it.
      // Otherwise use the browser's blob type.
      // --------------------------------------------------------

      let contentType =
        response.headers.get(
          "content-type"
        ) ||
        blob.type ||
        "application/octet-stream";

      // Remove parameters such as:
      // application/json; charset=utf-8
      contentType =
        contentType
          .split(";")[0]
          .trim();

      console.log(
        "FINAL CONTENT TYPE:",
        contentType
      );

      // --------------------------------------------------------
      // Create browser object URL.
      // --------------------------------------------------------

      const blobWithType =
        new Blob(
          [blob],
          {
            type: contentType,
          }
        );

      const blobUrl =
        window.URL.createObjectURL(
          blobWithType
        );

      console.log(
        "BLOB URL CREATED:",
        blobUrl
      );

      // --------------------------------------------------------
      // Open the file.
      // --------------------------------------------------------

      const newWindow =
        window.open(
          blobUrl,
          "_blank"
        );

      // --------------------------------------------------------
      // If browser blocks popup.
      // --------------------------------------------------------

      if (!newWindow) {
        console.warn(
          "Popup blocked. Opening file in current tab."
        );

        window.location.href =
          blobUrl;

        return;
      }

      // --------------------------------------------------------
      // Clean up temporary URL later.
      // --------------------------------------------------------

      setTimeout(() => {
        window.URL.revokeObjectURL(
          blobUrl
        );
      }, 60000);

    } catch (error) {
      console.error(
        "================================"
      );

      console.error(
        "DROPBOX VIEW ERROR:"
      );

      console.error(
        error
      );

      console.error(
        "================================"
      );

      setError(
        error?.message ||
        "Failed to open Dropbox file."
      );

    } finally {
      setOpeningFile(
        null
      );
    }
  };

  // ============================================================
  // INITIAL PAGE LOAD
  // ============================================================

  useEffect(() => {
    const loadPage =
      async () => {
        // ------------------------------------------------------
        // Load normal profile.
        // ------------------------------------------------------

        await fetchProfile();

        // ------------------------------------------------------
        // Check Dropbox OAuth result.
        // ------------------------------------------------------

        const params =
          new URLSearchParams(
            window.location.search
          );

        const dropboxStatus =
          params.get(
            "dropbox"
          );

        if (
          dropboxStatus ===
          "connected"
        ) {
          console.log(
            "Dropbox OAuth completed successfully."
          );

          setDropboxConnected(
            true
          );

          setMessage(
            "Dropbox connected successfully!"
          );

          // ----------------------------------------------------
          // Remove OAuth query from browser address.
          // ----------------------------------------------------

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          // ----------------------------------------------------
          // Load Dropbox files.
          // ----------------------------------------------------

          await fetchDropboxFiles();
        }
      };

    loadPage();
  }, []);

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-400">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // PROFILE PAGE
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">

      <div className="max-w-2xl mx-auto">

        {/* ======================================================
            PAGE TITLE
        ====================================================== */}

        <h1 className="text-4xl font-bold mb-8">
          👤 Profile
        </h1>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">

          {/* ====================================================
              AVATAR
          ==================================================== */}

          <div className="flex justify-center mb-6">

            <div className="w-24 h-24 rounded-full bg-sky-600 flex items-center justify-center text-4xl">
              👤
            </div>

          </div>

          {/* ====================================================
              USER ID
          ==================================================== */}

          <div className="mb-6">

            <label className="block text-gray-400 text-sm mb-2">
              User ID
            </label>

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-gray-300 break-all">
              {profile?.id || "Not available"}
            </div>

          </div>

          {/* ====================================================
              EMAIL
          ==================================================== */}

          {profile?.email && (
            <div className="mb-6">

              <label className="block text-gray-400 text-sm mb-2">
                Email
              </label>

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-gray-300 break-all">
                {profile.email}
              </div>

            </div>
          )}

          {/* ====================================================
              DISPLAY NAME
          ==================================================== */}

          <form
            onSubmit={
              updateProfile
            }
          >

            <label className="block text-gray-400 text-sm mb-2">
              Display Name
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(event) =>
                setDisplayName(
                  event.target.value
                )
              }
              placeholder="Enter your display name"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-sky-500"
            />

            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 rounded-lg p-3 font-semibold"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

          </form>

          {/* ====================================================
              DROPBOX SECTION
          ==================================================== */}

          <div className="mt-8 pt-8 border-t border-slate-700">

            <h2 className="text-2xl font-bold mb-4">
              Dropbox
            </h2>

            {/* ==================================================
                NOT CONNECTED
            ================================================== */}

            {!dropboxConnected && (
              <div>

                <p className="text-gray-400 mb-4">
                  Connect your Dropbox account to
                  access your Dropbox files.
                </p>

                <button
                  type="button"
                  onClick={
                    connectDropbox
                  }
                  className="w-full bg-blue-600 hover:bg-blue-500 rounded-lg p-3 font-semibold"
                >
                  Connect Dropbox
                </button>

              </div>
            )}

            {/* ==================================================
                CONNECTED
            ================================================== */}

            {dropboxConnected && (
              <div>

                {/* ==============================================
                    CONNECTED STATUS
                ============================================== */}

                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">

                  <p className="text-green-400 font-semibold">
                    ✓ Dropbox Connected
                  </p>

                  <p className="text-gray-400 text-sm mt-1">
                    Your Dropbox account is connected
                    successfully.
                  </p>

                </div>

                {/* ==============================================
                    REFRESH
                ============================================== */}

                <button
                  type="button"
                  onClick={
                    fetchDropboxFiles
                  }
                  disabled={
                    dropboxLoading
                  }
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded-lg p-3 font-semibold"
                >
                  {dropboxLoading
                    ? "Loading Dropbox files..."
                    : "Refresh Dropbox Files"}
                </button>

                {/* ==============================================
                    FILE LIST
                ============================================== */}

                <div className="mt-5">

                  <h3 className="text-lg font-semibold mb-3">
                    Dropbox Files
                  </h3>

                  {/* ============================================
                      LOADING
                  ============================================ */}

                  {dropboxLoading && (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-gray-400">
                      Loading Dropbox files...
                    </div>
                  )}

                  {/* ============================================
                      EMPTY
                  ============================================ */}

                  {!dropboxLoading &&
                    dropboxFiles.length === 0 && (
                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-gray-400">
                        No files found in Dropbox.
                      </div>
                    )}

                  {/* ============================================
                      FILES
                  ============================================ */}

                  {!dropboxLoading &&
                    dropboxFiles.length > 0 && (
                      <div className="space-y-3">

                        {dropboxFiles.map(
                          (file) => {

                            const filePath =
                              file?.path ||
                              "";

                            const isOpening =
                              openingFile ===
                              filePath;

                            return (
                              <div
                                key={
                                  file?.id ||
                                  filePath ||
                                  file?.name
                                }
                                className="bg-slate-900 border border-slate-700 rounded-lg p-4"
                              >

                                {/* FILE NAME */}

                                <p className="font-semibold text-white break-all">
                                  📄{" "}
                                  {file?.name ||
                                    "Unnamed file"}
                                </p>

                                {/* FILE PATH */}

                                <p className="text-gray-500 text-sm mt-1 break-all">
                                  {filePath}
                                </p>

                                {/* FILE SIZE */}

                                <p className="text-gray-500 text-xs mt-1">
                                  {typeof file?.size ===
                                  "number"
                                    ? `${file.size.toLocaleString()} bytes`
                                    : "Size unavailable"}
                                </p>

                                {/* VIEW BUTTON */}

                                <button
                                  type="button"
                                  disabled={
                                    isOpening
                                  }
                                  onClick={() =>
                                    viewDropboxFile(
                                      file
                                    )
                                  }
                                  className="mt-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded-lg px-4 py-2 font-semibold"
                                >
                                  {isOpening
                                    ? "Opening..."
                                    : "View"}
                                </button>

                              </div>
                            );
                          }
                        )}

                      </div>
                    )}

                </div>

              </div>
            )}

          </div>

          {/* ====================================================
              SUCCESS MESSAGE
          ==================================================== */}

          {message && (
            <div className="mt-4 bg-sky-900/30 border border-sky-700 rounded-lg p-3 text-center text-sky-300">
              {message}
            </div>
          )}

          {/* ====================================================
              ERROR MESSAGE
          ==================================================== */}

          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg p-3 text-center text-red-300">
              {error}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}