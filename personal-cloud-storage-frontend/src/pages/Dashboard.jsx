import { useEffect, useState } from "react";
import api from "../api/axios";
import SearchBar from "../components/SearchBar";
import UploadBar from "../components/UploadBar";
import CreateFolder from "../components/CreateFolder";
import { useNavigate } from "react-router-dom";

// ===============================
// GET FILE ICON
// ===============================
const getFileIcon = (mimeType) => {
  if (!mimeType) return "📄";

  if (mimeType.startsWith("image/")) {
    return "🖼️";
  }

  if (mimeType.startsWith("video/")) {
    return "🎬";
  }

  if (mimeType.startsWith("audio/")) {
    return "🎵";
  }

  if (mimeType === "application/pdf") {
    return "📕";
  }

  if (
    mimeType.includes("word") ||
    mimeType.includes("document")
  ) {
    return "📝";
  }

  if (
    mimeType.includes("sheet") ||
    mimeType.includes("excel")
  ) {
    return "📊";
  }

  if (
    mimeType.includes("zip") ||
    mimeType.includes("compressed")
  ) {
    return "📦";
  }

  return "📄";
};

export default function Dashboard() {
  const navigate = useNavigate();
const [files, setFiles] = useState([]);
const [storageUsed, setStorageUsed] = useState(0);
const [folders, setFolders] = useState([]);
const [sortOption, setSortOption] = useState("newest");
const [selectedFile, setSelectedFile] = useState(null);
const [uploading, setUploading] = useState(false);
const [moveFileData, setMoveFileData] = useState(null);

const [currentFolder, setCurrentFolder] = useState(null);
const [trashFiles, setTrashFiles] = useState([]);
const [showTrash, setShowTrash] = useState(false);
const [folderName, setFolderName] = useState("");
const [searchTerm, setSearchTerm] = useState("");
const [openMenu, setOpenMenu] = useState(null);
const [previewUrl, setPreviewUrl] = useState(null);
const [previewFileData, setPreviewFileData] = useState(null);
const [uploadProgress, setUploadProgress] = useState(0);
const [showFavorites, setShowFavorites] = useState(false);
const [favoriteFiles, setFavoriteFiles] = useState([]);
useEffect(() => {


  fetchFiles();
  fetchFolders();
}, []);
// ===============================
// FETCH FILES
// ===============================
const fetchFiles = async (folderId = null) => {
  try {
    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const url = folderId
      ? `/files?folder_id=${folderId}`
      : "/files";

    const response = await api.get(url, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const fetchedFiles = response.data.files || [];

    setFiles(fetchedFiles);

    // Calculate total storage used
    const totalStorageUsed = fetchedFiles.reduce(
      (total, file) => total + Number(file.file_size || 0),
      0
    );

    setStorageUsed(totalStorageUsed);

  } catch (error) {
    console.error(error);
    alert("Failed to load files.");
  }
};
  // ===============================
// FETCH FOLDERS
// ===============================
const fetchFolders = async () => {

  try {

    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const response = await api.get(
      "/folders",
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    setFolders(response.data.folders);

  } catch (error) {

    console.error(error);

  }

};

const openFolder = async (folder) => {

  try {

    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const response = await api.get(
      `/folders/${folder.id}/files`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

setCurrentFolder(folder);



setFiles(response.data.files);
  } catch (error) {

    console.error(error);

    alert("Failed to open folder.");

  }

};

// ===============================
// FETCH FAVORITE FILES
// ===============================
const fetchFavorites = async () => {

  try {

    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const response = await api.get(
      "/favorites",
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    setFavoriteFiles(response.data.files || []);

  } catch (error) {

    console.error(
      "FETCH FAVORITES ERROR:",
      error
    );

    console.error(
      "Server response:",
      error.response?.data
    );

    alert(
      error.response?.data?.message ||
      "Failed to load Favorites."
    );
  }
};

// ===============================
// FETCH TRASH
// ===============================
const fetchTrash = async () => {

    try {

        const session = JSON.parse(
            localStorage.getItem("session")
        );

        const response = await api.get(
            "/trash",
            {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            }
        );

        setTrashFiles(response.data.files);

    } catch (error) {

        console.error("FETCH TRASH ERROR:", error);

        alert(
            error.response?.data?.message ||
            "Failed to load Trash."
        );

    }

};

// ===============================
// RESTORE FILE
// ===============================
const restoreFile = async (fileId) => {

  try {

    const session = JSON.parse(
      localStorage.getItem("session")
    );

    await api.patch(
      `/files/${fileId}/restore`,
      {},
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    alert("File restored successfully!");

    // Refresh Trash
    fetchTrash();

    // Refresh normal files
    if (currentFolder) {
      fetchFiles(currentFolder.id);
    } else {
      fetchFiles();
    }

  } catch (error) {

    console.error("RESTORE ERROR:", error);
    console.error(
      "Server response:",
      error.response?.data
    );

    alert(
      error.response?.data?.message ||
      "Failed to restore file."
    );
  }
};

// ===============================
// SHARE FILE
// ===============================
const shareFile = async (fileId) => {

  try {

    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const response = await api.post(
      `/files/${fileId}/share`,
      {},
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const shareToken = response.data.share.share_token;

const shareUrl =
  `http://localhost:3000/api/share/${shareToken}`;


    console.log("🔗 SHARE URL:", shareUrl);

    await navigator.clipboard.writeText(shareUrl);

    alert(
      `Share link created and copied to clipboard!\n\n${shareUrl}`
    );

  } catch (error) {

    console.error(
      "SHARE FILE ERROR:",
      error
    );

    console.error(
      "Server response:",
      error.response?.data
    );

    alert(
      error.response?.data?.message ||
      "Failed to create share link."
    );
  }
};

// ===============================
// DELETE FILE FOREVER
// ===============================
const deleteFileForever = async (fileId) => {

  const confirmDelete = window.confirm(
    "This will permanently delete the file. This cannot be undone. Continue?"
  );

  if (!confirmDelete) return;

  try {

    const session = JSON.parse(
      localStorage.getItem("session")
    );

    await api.delete(
      `/files/${fileId}/permanent`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    alert("File permanently deleted.");

    fetchTrash();

  } catch (error) {

    console.error(
      "DELETE FOREVER ERROR:",
      error
    );

    console.error(
      "Server response:",
      error.response?.data
    );

    alert(
      error.response?.data?.message ||
      "Failed to permanently delete file."
    );
  }
};

// ===============================
// GO TO PARENT FOLDER
// ===============================
const goToParentFolder = async () => {

  // If we're already at root, do nothing
  if (!currentFolder) {
    return;
  }

  // If the current folder has no parent,
  // go back to root
  if (!currentFolder.parent_folder_id) {

    setCurrentFolder(null);
    fetchFiles();
    setOpenMenu(null);

    return;
  }

  // Find the parent folder from our existing folders list
  const parentFolder = folders.find(
    folder =>
      folder.id === currentFolder.parent_folder_id
  );

  if (!parentFolder) {

    alert("Parent folder not found.");

    return;
  }

  // Open the parent folder
  await openFolder(parentFolder);

  setOpenMenu(null);
};

// ===============================
// CREATE FOLDER
// ===============================
const createFolder = async () => {
  if (!folderName.trim()) {
    alert("Enter a folder name.");
    return;
  }

  try {
    const session = JSON.parse(
      localStorage.getItem("session")
    );

    await api.post(
      "/folders",
      {
        folder_name: folderName.trim(),
        parent_folder_id: currentFolder?.id || null,
      },
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    alert("Folder created successfully!");

    setFolderName("");

    // Refresh folders
    fetchFolders();

  } catch (error) {
    console.error("CREATE FOLDER ERROR:", error);
    console.error(
      "Server response:",
      error.response?.data
    );

    alert(
      error.response?.data?.message ||
      "Failed to create folder."
    );
  }
};



// ===============================
  // DOWNLOAD FILE
  // ===============================
  const downloadFile = async (fileId, fileName) => {
    try {
      const session = JSON.parse(localStorage.getItem("session"));

      const response = await api.get(
        `/files/download/${fileId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
        "Download failed."
      );
    }
  };

// ===============================
// PREVIEW FILE
// ===============================
const previewFile = async (file) => {
  try {
    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const response = await api.get(
      `/files/download/${file.id}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        responseType: "blob",
      }
    );

    const blob = new Blob(
      [response.data],
      {
        type: file.mime_type || "application/octet-stream",
      }
    );

    const url = window.URL.createObjectURL(blob);

    setPreviewUrl(url);
    setPreviewFileData(file);

  } catch (error) {

    console.error(error);

    alert(
      error.response?.data?.message ||
      "Preview failed."
    );

  }
};

  // ===============================
  // RENAME FILE
  // ===============================
  const renameFile = async (fileId, currentName) => {

    const newName = prompt(
      "Enter the new filename:",
      currentName
    );

    if (!newName) return;

    try {

      const session = JSON.parse(
        localStorage.getItem("session")
      );

      const response = await api.patch(
        `/files/${fileId}`,
        {
          newName,
        },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      alert(response.data.message);

      fetchFiles();

    } catch (error) {

      console.error(error);

      alert(
        error.response?.data?.message ||
        "Rename failed."
      );

    }

  };

// ===============================
// RENAME FOLDER
// ===============================
const renameFolder = async (folderId, currentName) => {

  const newName = prompt(
    "Enter the new folder name:",
    currentName
  );

  if (!newName || !newName.trim()) return;

  try {

    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const response = await api.patch(
      `/folders/${folderId}`,
      {
        folder_name: newName.trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    alert(response.data.message);

    fetchFolders();

  } catch (error) {

    console.error(error);

    alert(
      error.response?.data?.message ||
      "Folder rename failed."
    );

  }

};

// ===============================
// DELETE FOLDER
// ===============================
const deleteFolder = async (folderId) => {

  const confirmDelete = window.confirm(
    "Are you sure you want to delete this folder?"
  );

  if (!confirmDelete) return;

  try {

    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const response = await api.delete(
      `/folders/${folderId}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    alert(response.data.message);

    fetchFolders();

    // If the deleted folder was currently open,
    // return to the root folder.
    if (currentFolder?.id === folderId) {
      setCurrentFolder(null);
      fetchFiles();
    }

  } catch (error) {

    console.error(error);

    alert(
      error.response?.data?.message ||
      "Folder deletion failed."
    );

  }

};

// ===============================
// UPLOAD FILE
// ===============================
const uploadFile = async () => {
  if (!selectedFile) {
    alert("Please choose a file first.");
    return;
  }

setUploading(true);
setUploadProgress(0);

// ===============================
// FILE VALIDATION
// ===============================

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

if (selectedFile.size > MAX_FILE_SIZE) {
  alert("File is too large. Maximum file size is 100 MB.");
  setUploading(false);
  setUploadProgress(0);
  return;
}

try {
    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const formData = new FormData();

    formData.append("file", selectedFile);

    if (currentFolder) {
      formData.append(
        "folder_id",
        currentFolder.id
      );
    }

    await api.post(
      "/files/upload",
      formData,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "multipart/form-data",
        },

        // Track upload progress
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) /
              progressEvent.total
            );

            setUploadProgress(percent);
          }
        },
      }
    );

    setUploadProgress(100);

    alert("File uploaded successfully!");

    setSelectedFile(null);

    // Refresh files
    if (currentFolder) {
      fetchFiles(currentFolder.id);
    } else {
      fetchFiles();
    }

  } catch (error) {

    console.error("UPLOAD ERROR:", error);

    console.error(
      "Server response:",
      error.response?.data
    );

    alert(
      error.response?.data?.message ||
      "File upload failed."
    );

  } finally {

    setUploading(false);

    // Give the 100% state a moment to display
    setTimeout(() => {
      setUploadProgress(0);
    }, 500);
  }
};

// ===============================
// MOVE FILE
// ===============================
const moveFile = async (fileId, destinationFolder) => {

  if (!destinationFolder) {
    alert("No destination folder selected.");
    return;
  }

  try {

    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const response = await api.patch(
      `/files/${fileId}/move`,
      {
        folder_id: destinationFolder.id
      },
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    alert(response.data.message);

    if (currentFolder) {
      openFolder(currentFolder);
    } else {
      fetchFiles();
    }

  } catch (error) {

    console.error(error);

    alert(
      error.response?.data?.message ||
      "Move failed."
    );

  }

};

// ===============================
// TOGGLE FILE FAVORITE
// ===============================
const toggleFavorite = async (fileId) => {

  try {

    const session = JSON.parse(
      localStorage.getItem("session")
    );

    const response = await api.patch(
      `/files/${fileId}/favorite`,
      {},
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    alert(response.data.message);

    // Refresh current file list
    if (currentFolder) {
      fetchFiles(currentFolder.id);
    } else {
      fetchFiles();
    }

  } catch (error) {

    console.error(
      "TOGGLE FAVORITE ERROR:",
      error
    );

    console.error(
      "Server response:",
      error.response?.data
    );

    alert(
      error.response?.data?.message ||
      "Failed to update favorite."
    );
  }
};

  // ===============================
  // DELETE FILE
  // ===============================
  const deleteFile = async (fileId) => {

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this file?"
    );

    if (!confirmDelete) return;

    try {

      const session = JSON.parse(
        localStorage.getItem("session")
      );

      await api.delete(`/files/${fileId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      alert("File deleted successfully!");

      fetchFiles();

    } catch (error) {

      console.error(error);

      alert(
        error.response?.data?.message ||
        "Failed to delete file."
      );

    }

  };

const filteredFolders = folders.filter(folder =>
  folder.folder_name
    .toLowerCase()
    .includes(searchTerm.trim().toLowerCase())
);

const filteredFiles = files.filter(file =>
  file.original_name
    .toLowerCase()
    .includes(searchTerm.trim().toLowerCase())
);

// ===============================
// SORT FILES
// ===============================
const sortedFiles = [...filteredFiles].sort((a, b) => {

  if (sortOption === "newest") {
    return new Date(b.created_at) - new Date(a.created_at);
  }

  if (sortOption === "oldest") {
    return new Date(a.created_at) - new Date(b.created_at);
  }

  if (sortOption === "name-asc") {
    return a.original_name.localeCompare(b.original_name);
  }

  if (sortOption === "name-desc") {
    return b.original_name.localeCompare(a.original_name);
  }

  if (sortOption === "largest") {
    return b.file_size - a.file_size;
  }

  if (sortOption === "smallest") {
    return a.file_size - b.file_size;
  }

  return 0;
});


/* =========================================
   FAVORITES VIEW
========================================= */

if (showFavorites) {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">

      <div className="flex items-center justify-between mb-8">

        <h1 className="text-4xl font-bold">
          ⭐ Favorites
        </h1>

        <button
          onClick={() => {
            setShowFavorites(false);
            fetchFiles();
          }}
          className="text-sky-400 hover:text-sky-300 font-semibold"
        >
          ← Back to Files
        </button>

      </div>

      {favoriteFiles.length === 0 ? (

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">

          <p className="text-gray-400 text-lg">
            ⭐ No favorite files yet.
          </p>

        </div>

      ) : (

        <div className="space-y-4">

          {favoriteFiles.map((file) => (

            <div
              key={file.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex justify-between items-center"
            >

              <div>

                <h2 className="font-semibold flex items-center gap-3">

                  <span className="text-2xl">
                    {getFileIcon(file.mime_type)}
                  </span>

                  <span>
                    {file.original_name}
                  </span>

                </h2>

                <p className="text-gray-400 text-sm mt-1">
                  {file.mime_type}
                </p>

                <p className="text-gray-500 text-sm mt-1">
                  {(file.file_size / 1024).toFixed(2)} KB
                </p>

              </div>

              <div className="flex items-center gap-4">

                {/* PREVIEW */}
                <button
                  onClick={() => previewFile(file)}
                  className="text-sky-400 hover:text-sky-300 font-semibold"
                >
                  👁 Preview
                </button>

                {/* DOWNLOAD */}
                <button
                  onClick={() =>
                    downloadFile(
                      file.id,
                      file.original_name
                    )
                  }
                  className="text-green-400 hover:text-green-300 font-semibold"
                >
                  📥 Download
                </button>

                {/* REMOVE FAVORITE */}
                <button
                  onClick={async () => {
                    await toggleFavorite(file.id);
                    fetchFavorites();
                  }}
                  className="text-yellow-400 hover:text-yellow-300 font-semibold"
                >
                  ⭐ Remove
                </button>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}

/* =========================================
   TRASH VIEW
========================================= */

if (showTrash) {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">

      <div className="flex items-center justify-between mb-8">

        <h1 className="text-4xl font-bold">
          🗑️ Trash
        </h1>

        <button
          onClick={() => {
            setShowTrash(false);
            fetchFiles();
          }}
          className="text-sky-400 hover:text-sky-300 font-semibold"
        >
          ← Back to Files
        </button>

      </div>


      {trashFiles.length === 0 ? (

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">

          <p className="text-gray-400 text-lg">
            🗑️ Trash is empty.
          </p>

        </div>

      ) : (

        <div className="space-y-4">

          {trashFiles.map((file) => (

            <div
              key={file.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex justify-between items-center"
            >

              {/* FILE INFORMATION */}

              <div>

                <h2 className="font-semibold flex items-center gap-3">

                  <span className="text-2xl">
                    {getFileIcon(file.mime_type)}
                  </span>

                  <span>
                    {file.original_name}
                  </span>

                </h2>

                <p className="text-gray-400 text-sm mt-1">
                  {file.mime_type}
                </p>

                <p className="text-gray-500 text-sm mt-1">

                  Deleted:{" "}

                  {file.deleted_at
                    ? new Date(file.deleted_at).toLocaleString()
                    : "Unknown"}

                </p>

              </div>


              {/* TRASH ACTIONS */}

              <div className="flex items-center gap-4">

                <button
                  onClick={() => restoreFile(file.id)}
                  className="text-green-400 hover:text-green-300 font-semibold"
                >
                  ♻️ Restore
                </button>


                <button
                  onClick={() => deleteFileForever(file.id)}
                  className="text-red-400 hover:text-red-300 font-semibold"
                >
                  🗑️ Delete Forever
                </button>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );

}


return (
  <div
  className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8"
  onClick={() => setOpenMenu(null)}
>
   {/* PAGE TITLE */}
    <h1 className="text-4xl font-bold mb-8">
      My Files
    </h1>


{/* STORAGE USAGE */}
<div className="bg-slate-800 rounded-xl p-5 mb-8 border border-slate-700">

  <div className="flex justify-between items-center mb-4">

    <h2 className="text-lg font-semibold">
      💾 Storage
    </h2>

    <span className="text-sm text-gray-400">
      {(storageUsed / (1024 * 1024)).toFixed(2)} MB / 1024 MB
    </span>

  </div>

  {/* PROGRESS BAR */}
  <div className="w-full bg-slate-700 rounded-full h-3 mb-4">

    <div
      className="bg-sky-500 h-3 rounded-full transition-all"
      style={{
        width: `${Math.min(
          (storageUsed / (1024 * 1024 * 1024)) * 100,
          100
        )}%`
      }}
    />

  </div>

  {/* STORAGE DETAILS */}
  <div className="flex justify-between text-sm">

    <span className="text-gray-400">
      {(storageUsed / (1024 * 1024)).toFixed(2)} MB used
    </span>

    <span className="text-gray-400">
      {Math.max(
        1024 - storageUsed / (1024 * 1024),
        0
      ).toFixed(2)} MB remaining
    </span>

  </div>

  {/* FILE COUNT */}
  <p className="text-sm text-gray-500 mt-3">
    📁 {files.length} file{files.length !== 1 ? "s" : ""}
  </p>

</div>

    {/* SEARCH */}
    <input
      type="text"
      placeholder="🔍 Search files and folders..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full mb-6 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-gray-400 focus:outline-none focus:border-sky-500"
    />

{/* UPLOAD */}

<div className="mb-8">

  <div className="flex items-center gap-4">

    {/* CHOOSE FILE */}

    <label
      htmlFor="fileInput"
      className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg cursor-pointer font-semibold transition"
    >
      Choose File
    </label>

    <input
      id="fileInput"
      type="file"
      className="hidden"
      onChange={(e) =>
        setSelectedFile(e.target.files[0])
      }
    />

    {/* FILE NAME */}

    <span className="text-gray-300">
      {selectedFile
        ? selectedFile.name
        : "No file selected"}
    </span>

    {/* UPLOAD BUTTON */}

    <button
      onClick={uploadFile}
      disabled={uploading}
      className={`px-4 py-2 rounded-lg font-semibold transition ${
        uploading
          ? "bg-gray-600 cursor-not-allowed"
          : "bg-green-600 hover:bg-green-700"
      } text-white`}
    >
      {uploading
        ? `Uploading ${uploadProgress}%`
        : "Upload"}
    </button>

  </div>


  {/* UPLOAD PROGRESS */}

  {uploading && (

    <div className="mt-4 w-full">

      <div className="flex justify-between text-sm text-gray-400 mb-2">

        <span>
          Uploading file...
        </span>

        <span>
          {uploadProgress}%
        </span>

      </div>

      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">

        <div
          className="h-full bg-sky-500 rounded-full transition-all duration-200"
          style={{
            width: `${uploadProgress}%`,
          }}
        />

      </div>

    </div>

  )}

</div>



{/* FOLDERS */}



<h2 className="text-2xl font-bold mb-4">
  Folders
</h2>

<CreateFolder
  folderName={folderName}
  setFolderName={setFolderName}
  createFolder={createFolder}
/>

<div
  className="space-y-2 mb-8"
  onClick={() => setOpenMenu(null)}
>
  {filteredFolders.length === 0 ? (

    <p className="text-gray-400">
      No matching folders.
    </p>

  ) : (

    filteredFolders.map((folder) => (

<div
  key={folder.id}
  onClick={() => openFolder(folder)}
  className="bg-sky-700 rounded-lg p-4 flex justify-between items-center hover:bg-sky-600 cursor-pointer transition"
>

  {/* FOLDER NAME */}
  <div className="flex-1">
    📁 {folder.folder_name}
  </div>

        {/* FOLDER THREE-DOT MENU */}
        <div className="relative">

          <button
            onClick={(e) => {
              e.stopPropagation();

              setOpenMenu(
                openMenu === `folder-${folder.id}`
                  ? null
                  : `folder-${folder.id}`
              );
            }}
            className="text-2xl hover:text-sky-200 px-2"
          >
            ⋮
          </button>


          {/* FOLDER ACTION MENU */}
          {openMenu === `folder-${folder.id}` && (

            <div
              className="absolute right-0 top-10 bg-slate-800 rounded-lg shadow-xl border border-slate-700 w-44 z-50"
              onClick={(e) => e.stopPropagation()}
            >

              {/* RENAME */}
              <button
                onClick={() => {
                  renameFolder(
                    folder.id,
                    folder.folder_name
                  );
                  setOpenMenu(null);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-slate-700"
              >
                ✏ Rename
              </button>


              {/* DELETE */}
              <button
                onClick={() => {
                  deleteFolder(folder.id);
                  setOpenMenu(null);
                }}
                className="block w-full text-left px-4 py-2 text-red-400 hover:bg-red-600 hover:text-white"
              >
                🗑 Delete
              </button>

            </div>

          )}

        </div>

      </div>

    ))

  )}

</div>


{/* FOLDER NAVIGATION */}
<div className="flex items-center gap-2 mb-6 text-sm">

{/* FOLDER NAVIGATION */}

<div className="flex items-center gap-4 mb-6">

  {/* BACK TO PARENT */}
  {currentFolder && (
    <button
      onClick={() => {
        goToParentFolder();
      }}
      className="text-sky-400 hover:text-sky-300 font-semibold"
    >
      ← Back
    </button>
  )}

  {/* ROOT */}
  <button
    onClick={() => {
      setCurrentFolder(null);
      fetchFiles();
      setOpenMenu(null);
    }}
    className="text-sky-400 hover:text-sky-300 font-semibold"
  >
    🏠 Root
  </button>

</div>  

{/* FAVORITES */}
<button
  onClick={() => {
    setShowFavorites(true);
    setShowTrash(false);
    fetchFavorites();
    setOpenMenu(null);
  }}
  className="text-yellow-400 hover:text-yellow-300 font-semibold"
>
  ⭐ Favorites
</button>

<button
  onClick={() => navigate("/profile")}
  className="text-sky-400 hover:text-sky-300 font-semibold"
>
  👤 Profile
</button>

{/* TRASH */}
<button
    onClick={() => {
        setShowTrash(true);
        fetchTrash();
        setOpenMenu(null);
    }}
    className="text-red-400 hover:text-red-300 font-semibold"
>
    🗑️ Trash
</button>

{/* CURRENT FOLDER */}
  {currentFolder && (
    <>
      <span className="text-gray-500">
        →
      </span>

      <span className="text-white font-semibold">
        📁 {currentFolder.folder_name}
      </span>
    </>
  )}

</div>

{/* FILES */}
{/* SORT FILES */}
<div className="flex justify-end mb-4">

  <select
    value={sortOption}
    onChange={(e) => setSortOption(e.target.value)}
    className="bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-2"
  >

    <option value="newest">
      Newest first
    </option>

    <option value="oldest">
      Oldest first
    </option>

    <option value="name-asc">
      Name (A → Z)
    </option>

    <option value="name-desc">
      Name (Z → A)
    </option>

    <option value="largest">
      Largest first
    </option>

    <option value="smallest">
      Smallest first
    </option>

  </select>

</div>

{files.length === 0 ? (

  <p className="text-gray-400">
    No files uploaded yet.
  </p>

) : (

  <div
    className="space-y-4"
    onClick={() => setOpenMenu(null)}
  >

    {sortedFiles.map((file, index) => (

      <div
        key={file.id}
        className="bg-slate-800 rounded-xl p-4 flex justify-between items-center"
      >

        {/* FILE INFORMATION */}
        <div>
<h2 className="font-semibold flex items-center gap-3">

  <span className="text-2xl">
    {getFileIcon(file.mime_type)}
  </span>

  <span>
    {file.original_name}
  </span>

</h2>

<p className="text-gray-400 text-sm">
  {file.mime_type}
</p>
        </div>


        {/* FILE ACTIONS */}
        <div className="relative flex items-center gap-4">

          <span>
            {(file.file_size / 1024).toFixed(2)} KB
          </span>


          {/* FILE THREE DOTS */}
          <button
            onClick={(e) => {
              e.stopPropagation();

              setOpenMenu(
                openMenu === `file-${file.id}`
                  ? null
                  : `file-${file.id}`
              );
            }}
            className="text-2xl hover:text-sky-400 px-2"
          >
            ⋮
          </button>


          {/* FILE ACTION MENU */}
          {openMenu === `file-${file.id}` && (

            <div
              className={`absolute right-0 ${
                index >= filteredFiles.length - 2
                  ? "bottom-10"
                  : "top-10"
              } bg-slate-800 rounded-lg shadow-xl border border-slate-700 w-44 z-50`}
              onClick={(e) => e.stopPropagation()}
            >

              {/* PREVIEW */}
              <button
                onClick={() => {
                  previewFile(file);
                  setOpenMenu(null);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-slate-700"
              >
                👁 Preview
              </button>


              {/* DOWNLOAD */}
              <button
                onClick={() => {
                  downloadFile(
                    file.id,
                    file.original_name
                  );
                  setOpenMenu(null);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-slate-700"
              >
                📥 Download
              </button>

{/* SHARE */}
<button
  onClick={() => {
    shareFile(file.id);
    setOpenMenu(null);
  }}
  className="block w-full text-left px-4 py-2 hover:bg-slate-700"
>
  🔗 Share
</button>

{/* FAVORITE */}
<button
  onClick={() => {
    toggleFavorite(file.id);
    setOpenMenu(null);
  }}
  className="block w-full text-left px-4 py-2 hover:bg-slate-700"
>
  {file.is_favorite
    ? "⭐ Remove from Favorites"
    : "☆ Add to Favorites"}
</button>

              {/* RENAME */}
              <button
                onClick={() => {
                  renameFile(
                    file.id,
                    file.original_name
                  );
                  setOpenMenu(null);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-slate-700"
              >
                ✏ Rename
              </button>


              {/* MOVE */}
              <button
                onClick={() => {
                  setMoveFileData(file);
                  setOpenMenu(null);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-slate-700"
              >
                📂 Move
              </button>


              {/* DELETE */}
              <button
                onClick={() => {
                  deleteFile(file.id);
                  setOpenMenu(null);
                }}
                className="block w-full text-left px-4 py-2 text-red-400 hover:bg-red-600 hover:text-white"
              >
                🗑 Delete
              </button>

            </div>

          )}

        </div>

      </div>

    ))}

  </div>

)}


{/* =========================================
    PREVIEW MODAL
========================================= */}

{previewUrl && previewFileData && (

  <div
    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
    onClick={() => {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewFileData(null);
    }}
  >

    {/* PREVIEW WINDOW */}
    <div
      className="relative bg-slate-900 rounded-xl p-6 max-w-5xl max-h-[90vh] w-[90%] overflow-auto"
      onClick={(e) => e.stopPropagation()}
    >

      {/* CLOSE BUTTON */}
      <button
        onClick={() => {
          window.URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
          setPreviewFileData(null);
        }}
        className="absolute top-3 right-3 text-white text-2xl hover:text-red-400"
      >
        ✕
      </button>


      {/* FILE NAME */}
      <h2 className="text-xl font-bold mb-4 pr-10">
        {previewFileData.original_name}
      </h2>


      {/* IMAGE */}
      {previewFileData.mime_type?.startsWith("image/") && (

        <img
          src={previewUrl}
          alt={previewFileData.original_name}
          className="max-w-full max-h-[70vh] mx-auto rounded-lg"
        />

      )}


      {/* VIDEO */}
      {previewFileData.mime_type?.startsWith("video/") && (

        <video
          src={previewUrl}
          controls
          className="max-w-full max-h-[70vh] mx-auto rounded-lg"
        />

      )}


      {/* AUDIO */}
      {previewFileData.mime_type?.startsWith("audio/") && (

        <audio
          src={previewUrl}
          controls
          className="w-full mt-6"
        />

      )}


      {/* PDF */}
      {previewFileData.mime_type === "application/pdf" && (

        <iframe
          src={previewUrl}
          title={previewFileData.original_name}
          className="w-full h-[70vh] rounded-lg"
        />

      )}


      {/* UNSUPPORTED FILE */}
      {!previewFileData.mime_type?.startsWith("image/") &&
       !previewFileData.mime_type?.startsWith("video/") &&
       !previewFileData.mime_type?.startsWith("audio/") &&
       previewFileData.mime_type !== "application/pdf" && (

        <div className="text-center py-16">

          <p className="text-gray-300 text-lg mb-6">
            Preview is not available for this file type.
          </p>

          <button
            onClick={() =>
              downloadFile(
                previewFileData.id,
                previewFileData.original_name
              )
            }
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg font-semibold"
          >
            📥 Download File
          </button>

        </div>

      )}

    </div>

  </div>

)}


{/* =========================================
    MOVE FILE MODAL
========================================= */}

{moveFileData && (

  <div
    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
    onClick={() => setMoveFileData(null)}
  >

    <div
      className="bg-slate-800 rounded-xl p-6 w-[90%] max-w-md shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >

      <h2 className="text-2xl font-bold text-white mb-2">
        Move File
      </h2>

      <p className="text-gray-400 mb-4">
        Choose a destination folder:
      </p>

      <p className="font-semibold text-white mb-6">
        📄 {moveFileData.original_name}
      </p>


      {/* FOLDER LIST */}
      <div className="max-h-64 overflow-y-auto space-y-2">

        {folders.length === 0 ? (

          <p className="text-gray-400 text-center py-4">
            No folders available.
          </p>

        ) : (

          folders.map((folder) => (

            <button
              key={folder.id}
              type="button"
              onClick={() => {
                moveFile(
                  moveFileData.id,
                  folder
                );
                setMoveFileData(null);
              }}
              className="w-full text-left bg-slate-700 hover:bg-sky-600 text-white px-4 py-3 rounded-lg transition"
            >
              📁 {folder.folder_name}
            </button>

          ))

        )}

      </div>




      {/* CANCEL */}
      <button
        type="button"
        onClick={() => setMoveFileData(null)}
        className="w-full mt-6 bg-gray-600 hover:bg-gray-500 text-white px-4 py-3 rounded-lg"
      >
        Cancel
      </button>

    </div>

  </div>

)}

</div>
);

}