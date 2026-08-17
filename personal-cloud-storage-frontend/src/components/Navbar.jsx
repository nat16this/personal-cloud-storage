import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="w-full px-6 md:px-10 py-5 bg-slate-900 border-b border-slate-700 flex items-center justify-between">

      {/* Logo */}
      <Link
        to="/"
        className="text-xl md:text-2xl font-bold text-sky-400 hover:text-sky-300 transition"
      >
        Personal Cloud Storage
      </Link>

      {/* Navigation */}
      <div className="flex items-center gap-2 md:gap-4">

        <Link
          to="/login"
          className="px-4 md:px-5 py-2 rounded-lg text-gray-200 hover:bg-slate-800 hover:text-white transition"
        >
          Login
        </Link>

        <Link
          to="/register"
          className="bg-sky-600 hover:bg-sky-500 px-4 md:px-5 py-2 rounded-lg font-semibold text-white transition"
        >
          Register
        </Link>

      </div>

    </nav>
  );
}