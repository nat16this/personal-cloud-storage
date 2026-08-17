import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

const { session, user } = response.data;

localStorage.setItem("session", JSON.stringify(session));
localStorage.setItem("user", JSON.stringify(user));

alert("Login successful!");

navigate("/dashboard");
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message || "Login failed."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center">

      <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl w-[420px]">

        <h1 className="text-white text-4xl font-bold text-center">
          Welcome Back
        </h1>

        <p className="text-gray-400 text-center mt-3">
          Login to your Personal Cloud Storage
        </p>

        <form className="mt-10" onSubmit={handleLogin}>

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
            Login
          </button>

        </form>

        <p className="text-center text-gray-400 mt-8">

          Don't have an account?

          <Link
            to="/register"
            className="text-blue-400 ml-2"
          >
            Register
          </Link>

        </p>

      </div>

    </div>
  );
}