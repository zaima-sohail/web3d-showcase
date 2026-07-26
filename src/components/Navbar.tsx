"use client";

export default function Navbar() {
  return (
    <header className="bg-white shadow px-8 py-4 flex justify-between">

      <h2 className="text-2xl font-semibold">
        Admin Dashboard
      </h2>

      <button
        className="bg-red-500 text-white px-5 py-2 rounded"
      >
        Logout
      </button>

    </header>
  );
}