const { Dropbox } = require("dropbox");
const supabaseAdmin = require("../config/supabaseAdmin");

async function getDropboxClient(userId) {
  const { data: connection, error } = await supabaseAdmin
    .from("dropbox_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !connection) {
    throw new Error("Dropbox account is not connected.");
  }

  const dbx = new Dropbox({
    accessToken: connection.access_token,
    refreshToken: connection.refresh_token,
    clientId: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET,
  });

  return {
    dbx,
    connection,
  };
}

module.exports = {
  getDropboxClient,
};