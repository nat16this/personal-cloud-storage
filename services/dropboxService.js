const { Dropbox, DropboxAuth } = require("dropbox");
const supabaseAdmin = require("../config/supabaseAdmin");

async function getDropboxClient(userId) {
  // ============================================================
  // GET SAVED DROPBOX CONNECTION
  // ============================================================

  const { data: connection, error } = await supabaseAdmin
    .from("dropbox_connections")
    .select(
      "access_token, refresh_token, expires_at"
    )
    .eq("user_id", userId)
    .single();

  if (error || !connection) {
    throw new Error(
      "Dropbox account is not connected."
    );
  }

  if (!connection.refresh_token) {
    throw new Error(
      "Dropbox refresh token is missing. Please reconnect Dropbox."
    );
  }

  console.log(
    "Dropbox connection found for user:",
    userId
  );

  // ============================================================
  // CREATE DROPBOX AUTH OBJECT
  // ============================================================

  const dbxAuth = new DropboxAuth({
    clientId: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET,
  });

  dbxAuth.setAccessToken(
    connection.access_token
  );

  dbxAuth.setRefreshToken(
    connection.refresh_token
  );

  if (connection.expires_at) {
    dbxAuth.setAccessTokenExpiresAt(
      new Date(connection.expires_at)
    );
  }

  // ============================================================
  // REFRESH ACCESS TOKEN
  // ============================================================

  console.log(
    "Refreshing Dropbox access token..."
  );

  try {
    await dbxAuth.refreshAccessToken();

    console.log(
      "Dropbox access token refreshed successfully."
    );
  } catch (refreshError) {
    console.error(
      "Dropbox token refresh failed:",
      refreshError
    );

    throw new Error(
      "Dropbox authorization has expired. Please reconnect Dropbox."
    );
  }

  // ============================================================
  // GET NEW TOKEN
  // ============================================================

  const newAccessToken =
    dbxAuth.getAccessToken();

  const newRefreshToken =
    dbxAuth.getRefreshToken();

  const newExpiresAt =
    dbxAuth.getAccessTokenExpiresAt();

  if (!newAccessToken) {
    throw new Error(
      "Dropbox did not return a new access token."
    );
  }

  // ============================================================
  // SAVE NEW TOKEN
  // ============================================================

  const updateData = {
    access_token: newAccessToken,
    updated_at: new Date().toISOString(),
  };

  if (newRefreshToken) {
    updateData.refresh_token =
      newRefreshToken;
  }

  if (newExpiresAt) {
    updateData.expires_at =
      newExpiresAt.toISOString();
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

    throw new Error(
      "Dropbox token refreshed but could not be saved."
    );
  }

  console.log(
    "New Dropbox token saved successfully."
  );

  // ============================================================
  // CREATE DROPBOX CLIENT
  // ============================================================

  const dbx = new Dropbox({
    accessToken: newAccessToken,
    refreshToken:
      newRefreshToken || connection.refresh_token,
    clientId: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET,
  });

  return {
    dbx,
    connection: {
      ...connection,
      access_token: newAccessToken,
      refresh_token:
        newRefreshToken ||
        connection.refresh_token,
      expires_at:
        newExpiresAt
          ? newExpiresAt.toISOString()
          : connection.expires_at,
    },
  };
}

module.exports = {
  getDropboxClient,
};