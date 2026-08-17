export default function SearchBar({
    searchTerm,
    setSearchTerm
}) {
    return (
        <input
            type="text"
            placeholder="🔍 Search files and folders..."
            value={searchTerm}
            onChange={(e) =>
                setSearchTerm(e.target.value)
            }
            className="w-full mb-6 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-gray-400 focus:outline-none focus:border-sky-500"
        />
    );
}