"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ── Types ───────────────────────────────────────────────
interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Item {
  _id: string;
  name: string;
  description: string;
  category: Category | string;
  tags: string[];
  status: "draft" | "published";
  coverImage: string;
  images: string[];
  modelUrl: string;
  views: number;
  slug?: string;
  createdAt: string;
}

interface ItemsResponse {
  success: boolean;
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  items: Item[];
}

// ── Helpers ─────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function getCategoryName(cat: Category | string | undefined): string {
  if (!cat) return "Uncategorized";
  if (typeof cat === "object") return cat.name;
  return cat;
}

// ── Item Card Component ─────────────────────────────────
function ItemCard({ item }: { item: Item }) {
  const categoryName = getCategoryName(item.category);

  return (
    <Link
      href={`/showcase/${item._id}`}
      className="group bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
    >
      {/* Cover Image */}
      <div className="relative h-52 bg-gray-800 overflow-hidden">
        {item.coverImage ? (
          <img
            src={item.coverImage}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/600x400/1f2937/3b82f6?text=${encodeURIComponent(item.name.charAt(0))}`;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-gray-700">
            📦
          </div>
        )}

        {/* Views badge */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-xs text-gray-300 px-2.5 py-1 rounded-full flex items-center gap-1">
          👁 {item.views.toLocaleString()}
        </div>

        {/* Model indicator */}
        {item.modelUrl && (
          <div className="absolute top-3 left-3 bg-purple-600/80 text-xs text-white px-2.5 py-1 rounded-full flex items-center gap-1">
            🧊 3D
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
            {categoryName}
          </span>
          {item.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
          {item.name}
        </h3>

        {item.description && (
          <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">
            {item.description}
          </p>
        )}

        <p className="text-xs text-gray-600 mt-3">{formatDate(item.createdAt)}</p>
      </div>
    </Link>
  );
}

// ── Loading Skeleton ────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 animate-pulse">
          <div className="h-52 bg-gray-800" />
          <div className="p-5 space-y-3">
            <div className="h-4 bg-gray-800 rounded w-24" />
            <div className="h-5 bg-gray-800 rounded w-3/4" />
            <div className="h-4 bg-gray-800 rounded w-full" />
            <div className="h-3 bg-gray-800 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Showcase Page ──────────────────────────────────
export default function ShowcasePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const limit = 12;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", "published");
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/items?${params}`);
      const json: ItemsResponse = await res.json();

      if (json.success) {
        setItems(json.items);
        setTotalPages(json.totalPages);
        setTotalItems(json.totalItems);
      } else {
        setError("Failed to fetch items");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, page]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (json.success) setCategories(json.categories);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* ── Navbar ──────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
        <Link href="/" className="text-2xl font-bold text-blue-500">
          Web3D Showcase
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Home
          </Link>
          <Link
            href="/login"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Admin
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────── */}
      <section className="relative px-6 py-16 text-center bg-gradient-to-b from-gray-900 to-gray-950">
        <h1 className="text-5xl md:text-6xl font-bold mb-4">
          3D Model <span className="text-blue-500">Showcase</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Explore our collection of high-quality interactive 3D models.
          Click any item to view in full 3D detail.
        </p>

        {/* Search & Filter */}
        <div className="mt-10 max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
            <input
              type="text"
              placeholder="Search models..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-sm text-gray-500 mt-4">
            Showing {items.length} of {totalItems} items
          </p>
        )}
      </section>

      {/* ── Error ───────────────────────────────── */}
      {error && (
        <div className="max-w-4xl mx-auto px-6 mt-6">
          <div className="bg-red-900/50 text-red-400 rounded-xl p-4 text-center">
            ⚠ {error}
            <button onClick={fetchItems} className="ml-3 underline hover:text-red-300">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Grid ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">📦</p>
            <p className="text-xl text-gray-400">No published items yet</p>
            <p className="text-sm text-gray-600 mt-2">
              Check back later for new 3D models
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <ItemCard key={item._id} item={item} />
              ))}
            </div>

            {/* ── Pagination ──────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-5 py-2.5 border border-gray-700 rounded-xl text-sm disabled:opacity-30 hover:bg-gray-800 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-5 py-2.5 border border-gray-700 rounded-xl text-sm disabled:opacity-30 hover:bg-gray-800 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="text-center py-8 text-gray-600 border-t border-gray-800">
        © 2026 Web3D Showcase | Built with Next.js, Three.js & MongoDB
      </footer>
    </main>
  );
}

