import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/auth/signup", {
        email,
        password,
      });

      alert(response.data.message);

      // Go to Login page after successful registration
      navigate("/login");

    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message || "Registration failed."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center">

      <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl w-[420px]">

        <h1 className="text-white text-4xl font-bold text-center">
          Create Account
        </h1>

        <p className="text-gray-400 text-center mt-3">
          Create your Personal Cloud Storage account
        </p>

        <form className="mt-10" onSubmit={handleRegister}>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-700 text-white mb-5 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-700 text-white mb-6 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition p-4 rounded-xl font-semibold"
          >
            Create Account
          </button>

        </form>

        <p className="text-center text-gray-400 mt-8">

          Already have an account?

          <Link
            to="/login"
            className="text-blue-400 ml-2"
          >
            Login
          </Link>

        </p>

      </div>

    </div>
  );
}