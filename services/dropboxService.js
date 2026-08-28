const { Dropbox, DropboxAuth } = require("dropbox");
const supabaseAdmin = require("../config/supabaseAdmin");

async function getDropboxClient(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;

  if (!clientId) {
    throw new Error("DROPBOX_APP_KEY is missing.");
  }

  if (!clientSecret) {
    throw new Error("DROPBOX_APP_SECRET is missing.");
  }

  // ============================================================
  // LOAD DROPBOX CONNECTION
  // ============================================================

  const { data: connection, error } = await supabaseAdmin
    .from("dropbox_connections")
    .select(
      "user_id, access_token, refresh_token, expires_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Dropbox connection lookup error:",
      error
    );

    throw new Error(
      `Failed to load Dropbox connection: ${error.message}`
    );
  }

  if (!connection) {
    throw new Error(
      "Dropbox account is not connected. Please connect Dropbox first."
    );
  }

  if (!connection.refresh_token) {
    throw new Error(
      "Dropbox refresh token is missing. Please reconnect Dropbox."
    );
  }

  if (!connection.access_token) {
    throw new Error(
      "Dropbox access token is missing. Please reconnect Dropbox."
    );
  }

  console.log("================================");
  console.log("DROPBOX CONNECTION");
  console.log("User:", userId);
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
  console.log("================================");

  // ============================================================
  // CREATE DROPBOX AUTH OBJECT
  // ============================================================

  const authOptions = {
    clientId,
    clientSecret,
    accessToken: connection.access_token,
    refreshToken: connection.refresh_token,
  };

  // IMPORTANT:
  //
  // DropboxAuth uses AccessTokenExpiresAt.
  //
  // This capitalization matters.
  //

  if (connection.expires_at) {
    const expiresAt = new Date(
      connection.expires_at
    );

    if (!Number.isNaN(expiresAt.getTime())) {
      authOptions.AccessTokenExpiresAt = expiresAt;
    }
  }

  const dbxAuth = new DropboxAuth(
    authOptions
  );

  // ============================================================
  // CHECK / REFRESH ACCESS TOKEN
  // ============================================================

  try {
    await dbxAuth.checkAndRefreshAccessToken();

    console.log(
      "Dropbox access token checked/refreshed successfully."
    );
  } catch (error) {
    console.error(
      "Dropbox token refresh failed:"
    );

    console.error(error);

    throw new Error(
      "Dropbox authorization has expired or the refresh token is invalid. Please reconnect Dropbox."
    );
  }

  // ============================================================
  // GET CURRENT TOKEN VALUES
  // ============================================================

  const accessToken =
    dbxAuth.getAccessToken();

  const refreshToken =
    dbxAuth.getRefreshToken();

  const expiresAt =
    dbxAuth.getAccessTokenExpiresAt();

  if (!accessToken) {
    throw new Error(
      "Dropbox did not provide a valid access token."
    );
  }

  console.log(
    "Dropbox access token available:",
    !!accessToken
  );

  console.log(
    "Dropbox refresh token available:",
    !!refreshToken
  );

  console.log(
    "Dropbox token expiration:",
    expiresAt
  );

  // ============================================================
  // SAVE CURRENT TOKEN INFORMATION
  // ============================================================

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

  const { error: updateError } =
    await supabaseAdmin
      .from("dropbox_connections")
      .update(updateData)
      .eq("user_id", userId);

  if (updateError) {
    console.warn(
      "Warning: failed to save refreshed Dropbox token:",
      updateError
    );
  }

  // ============================================================
  // CREATE DROPBOX CLIENT
  // ============================================================

  const dbx = new Dropbox({
    auth: dbxAuth,
  });

  console.log(
    "Dropbox client created successfully."
  );

  return {
    dbx,
    dbxAuth,
  };
}

module.exports = {
  getDropboxClient,
};