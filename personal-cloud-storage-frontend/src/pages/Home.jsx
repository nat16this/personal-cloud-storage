import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
//import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

<Navbar />

<section className="flex flex-col items-center justify-center text-center pt-24 px-6">

  <span className="bg-blue-900 text-blue-300 px-4 py-2 rounded-full mb-8">

    Secure • Fast • Reliable

  </span>

  <h1 className="text-7xl font-black leading-tight">

    Store Everything

    <br />

    In One Place

  </h1>

  <p className="text-gray-400 text-xl mt-8 max-w-3xl">

    Upload, organize and access your files from anywhere in the
    world with secure cloud storage powered by your own backend.

  </p>

  <div className="flex gap-5 mt-12">

    <Link to="/register">

      <button className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-semibold shadow-lg transition-all hover:scale-105">

        Get Started →

      </button>

    </Link>

<a href="#features">
  <button className="border border-gray-500 hover:border-white hover:bg-white hover:text-black px-8 py-4 rounded-xl transition-all">
    Learn More
  </button>
</a>

  </div>

</section>

<section
  id="features"
  className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 px-12 pb-20 mt-28"
>
  {[
  {
    icon: "🔒",
    title: "Secure Storage",
    text: "All your files are protected using authenticated cloud storage."
  },
  {
    icon: "⚡",
    title: "Lightning Fast",
    text: "Optimized uploads and downloads powered by Express and Supabase."
  },
  {
    icon: "☁️",
    title: "Access Anywhere",
    text: "Your files are available on any device with an internet connection."
  },
  {
    icon: "📁",
    title: "Organized Folders",
    text: "Create, rename, move and organize folders with ease."
  }
].map((card) => (

    <div
      key={card.title}
      className="bg-slate-800/70 backdrop-blur-sm rounded-3xl p-8 border border-slate-700 hover:border-blue-500 hover:-translate-y-2 transition-all duration-300"
    >

      <div className="text-5xl mb-5">

        {card.icon}

      </div>

      <h2 className="text-2xl font-bold mb-4">

        {card.title}

      </h2>

      <p className="text-gray-400">

        {card.text}

      </p>

    </div>

  ))}

</section>



</div>
  );
}