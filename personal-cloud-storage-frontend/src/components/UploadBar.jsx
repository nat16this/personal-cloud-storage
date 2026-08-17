export default function UploadBar({
    selectedFile,
    setSelectedFile,
    uploadFile
}) {

    return (

        <div className="flex items-center gap-4 mb-8">

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

            <span className="text-gray-300">
                {selectedFile
                    ? selectedFile.name
                    : "No file selected"}
            </span>

            <button
                onClick={uploadFile}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
                Upload
            </button>

        </div>

    );

}