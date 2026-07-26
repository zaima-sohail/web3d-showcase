"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-6">

      <h1 className="text-3xl font-bold text-blue-500 mb-10">
        Web3D
      </h1>

      <nav className="space-y-5">

        <Link
          href="/admin"
          className="block hover:text-blue-400"
        >
          📊 Dashboard
        </Link>

        <Link
          href="/admin/items"
          className="block hover:text-blue-400"
        >
          📦 Items
        </Link>

        <Link
          href="/admin/categories"
          className="block hover:text-blue-400"
        >
          🏷 Categories
        </Link>

        <Link
          href="/admin/uploads"
          className="block hover:text-blue-400"
        >
          ☁ Uploads
        </Link>

      </nav>

    </aside>
  );
}