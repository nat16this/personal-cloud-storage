import { useEffect, useState } from "react";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // ===============================
  // LOAD PROFILE
  // ===============================
  const fetchProfile = async () => {
    try {
      const session = JSON.parse(
        localStorage.getItem("session")
      );

      if (!session?.access_token) {
        setMessage("You are not logged in.");
        return;
      }

      const response = await fetch(
        "https://personal-cloud-storage-1-r52f.onrender.com/api/profile",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load profile.");
      }

      setProfile(data.profile);
      setDisplayName(data.profile?.display_name || "");

    } catch (error) {
      console.error("PROFILE LOAD ERROR:", error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // UPDATE PROFILE
  // ===============================
  const updateProfile = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const session = JSON.parse(
        localStorage.getItem("session")
      );

      if (!session?.access_token) {
        setMessage("You are not logged in.");
        return;
      }

      const response = await fetch(
        "https://personal-cloud-storage-1-r52f.onrender.com/api/profile",
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            display_name: displayName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update profile."
        );
      }

      setProfile(data.profile);

      setMessage("Profile updated successfully!");

    } catch (error) {
      console.error("PROFILE UPDATE ERROR:", error);
      setMessage(error.message);

    } finally {
      setSaving(false);
    }
  };

  // ===============================
  // LOAD PROFILE ON PAGE OPEN
  // ===============================
  useEffect(() => {
    fetchProfile();
  }, []);

  // ===============================
  // LOADING
  // ===============================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <p className="text-gray-400">
          Loading profile...
        </p>
      </div>
    );
  }

  // ===============================
  // PROFILE PAGE
  // ===============================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">

      <div className="max-w-2xl mx-auto">

        <h1 className="text-4xl font-bold mb-8">
          👤 Profile
        </h1>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">

          {/* AVATAR */}

          <div className="flex justify-center mb-6">

            <div className="w-24 h-24 rounded-full bg-sky-600 flex items-center justify-center text-4xl">
              👤
            </div>

          </div>

          {/* USER ID */}

          <div className="mb-6">

            <label className="block text-gray-400 text-sm mb-2">
              User ID
            </label>

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-gray-300 break-all">
              {profile?.id}
            </div>

          </div>

          {/* DISPLAY NAME */}

          <form onSubmit={updateProfile}>

            <label className="block text-gray-400 text-sm mb-2">
              Display Name
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(e) =>
                setDisplayName(e.target.value)
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

{/* DROPBOX */}

<div className="mt-8 pt-8 border-t border-slate-700">

  <h2 className="text-2xl font-bold mb-4">
    Dropbox
  </h2>

  <p className="text-gray-400 mb-4">
    Connect your Dropbox account to access your Dropbox files.
  </p>

  <button
  type="button"
  onClick={async () => {
    try {
      setMessage("");

      const session = JSON.parse(
        localStorage.getItem("session")
      );

      if (!session?.access_token) {
        setMessage("You are not logged in.");
        return;
      }

      const response = await fetch(
        "https://personal-cloud-storage-1-r52f.onrender.com/api/dropbox/connect",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.authUrl) {
        throw new Error(
          data.error || "Failed to start Dropbox connection."
        );
      }

      // Redirect the browser to Dropbox
      window.location.href = data.authUrl;

    } catch (error) {
      console.error("DROPBOX CONNECT ERROR:", error);
      setMessage(error.message);
    }
  }}
  className="w-full bg-blue-600 hover:bg-blue-500 rounded-lg p-3 font-semibold"
>
  Connect Dropbox
</button>

</div>

          {/* MESSAGE */}

          {message && (
            <p className="mt-4 text-center text-sky-400">
              {message}
            </p>
          )}

        </div>

      </div>

    </div>
  );
}