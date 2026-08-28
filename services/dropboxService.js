const { Dropbox, DropboxAuth } = require("dropbox");
const supabaseAdmin = require("../config/supabaseAdmin");

const DROPBOX_CLIENT_ID = process.env.DROPBOX_APP_KEY;
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_APP_SECRET;

async function getDropboxClient(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!DROPBOX_CLIENT_ID) {
    throw new Error("DROPBOX_APP_KEY is missing.");
  }

  if (!DROPBOX_CLIENT_SECRET) {
    throw new Error("DROPBOX_APP_SECRET is missing.");
  }

  // ============================================================
  // GET SAVED DROPBOX CONNECTION
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
      "Failed to load Dropbox connection."
    );
  }

  if (!connection) {
    throw new Error(
      "Dropbox account is not connected. Please reconnect Dropbox."
    );
  }

  if (!connection.refresh_token) {
    throw new Error(
      "Dropbox refresh token is missing. Please reconnect Dropbox."
    );
  }

  console.log("======================================");
  console.log("DROPBOX AUTH CHECK");
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
  console.log("======================================");

  // ============================================================
  // CREATE DROPBOX AUTH OBJECT
  // ============================================================

  const dbxAuth = new DropboxAuth({
    clientId: DROPBOX_CLIENT_ID,
    clientSecret: DROPBOX_CLIENT_SECRET,

    accessToken: connection.access_token,

    refreshToken: connection.refresh_token,

    accessTokenExpiresAt: connection.expires_at
      ? new Date(connection.expires_at)
      : undefined,
  });

  // ============================================================
  // REFRESH TOKEN IF NECESSARY
  // ============================================================

  try {
    console.log(
      "Checking Dropbox access token..."
    );

    await dbxAuth.checkAndRefreshAccessToken();

    console.log(
      "Dropbox access token check completed."
    );
  } catch (error) {
    console.error(
      "Dropbox token refresh failed:"
    );

    console.error(
      error?.error || error?.message || error
    );

    throw new Error(
      "Dropbox authorization has expired or been revoked. Please reconnect Dropbox."
    );
  }

  // ============================================================
  // GET CURRENT TOKENS
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
    "Valid Dropbox access token obtained."
  );

  // ============================================================
  // SAVE REFRESHED TOKEN
  // ============================================================

  const updateData = {
    access_token: accessToken,
    updated_at: new Date().toISOString(),
  };

  if (refreshToken) {
    updateData.refresh_token =
      refreshToken;
  }

  if (expiresAt) {
    updateData.expires_at =
      new Date(expiresAt).toISOString();
  }

  const { error: updateError } =
    await supabaseAdmin
      .from("dropbox_connections")
      .update(updateData)
      .eq("user_id", userId);

  if (updateError) {
    console.error(
      "Failed to save refreshed Dropbox token:",
      updateError
    );

    // Do not stop the request here.
    // The token obtained above can still be used.
  } else {
    console.log(
      "Dropbox token information saved."
    );
  }

  // ============================================================
  // CREATE DROPBOX CLIENT USING DropboxAuth
  // ============================================================

  const dbx = new Dropbox({
    auth: dbxAuth,
  });

  // ============================================================
  // VERIFY THE TOKEN BEFORE RETURNING CLIENT
  // ============================================================

  try {
    await dbx.usersGetCurrentAccount();

    console.log(
      "Dropbox authentication verified successfully."
    );
  } catch (error) {
    console.error(
      "Dropbox authentication verification failed:"
    );

    console.error(
      error?.error || error?.message || error
    );

    throw new Error(
      "Dropbox rejected the saved authorization. Please reconnect Dropbox."
    );
  }

  console.log(
    "Dropbox client ready."
  );

  return {
    dbx,
    dbxAuth,
    connection,
  };
}

module.exports = {
  getDropboxClient,
};