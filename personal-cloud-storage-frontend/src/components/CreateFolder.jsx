function CreateFolder({
  folderName,
  setFolderName,
  createFolder,
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <input
        type="text"
        placeholder="Enter folder name"
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
      />

      <button onClick={createFolder}>
        📁 Create Folder
      </button>
    </div>
  );
}

export default CreateFolder;