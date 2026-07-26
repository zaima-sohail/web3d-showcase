"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
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

// ── Direct import (avoids Turbopack/CJS interop issues with lazy loading Three.js) ──
import ModelViewer from "@/src/components/ModelViewer";

// ── Fallback while 3D viewer loads ─────────────────────
function ViewerFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-2xl">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
        <p className="text-gray-400 text-sm mt-4">Loading 3D viewer...</p>
      </div>
    </div>
  );
}

// ── No-3D placeholder ──────────────────────────────────
function NoModelPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-2xl">
      <div className="text-center">
        <div className="text-8xl mb-4">🧊</div>
        <p className="text-gray-400">No 3D model available</p>
      </div>
    </div>
  );
}

// ── Format helpers ──────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

function getCategoryName(cat: Category | string | undefined): string {
  if (!cat) return "Uncategorized";
  if (typeof cat === "object") return cat.name;
  return cat;
}

// ── Main Detail Page ────────────────────────────────────
export default function ItemDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/items/${id}`);
        const json = await res.json();
        if (json.success) {
          setItem(json.item);
          console.log("[Showcase] Loaded item:", json.item.name);
          console.log("[Showcase] modelUrl:", json.item.modelUrl);
          console.log("[Showcase] coverImage:", json.item.coverImage);
        } else {
          setError(json.message ?? "Item not found");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  // ── Loading State ─────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-400 mt-6 text-lg">Loading model...</p>
        </div>
      </main>
    );
  }

  // ── Error State ───────────────────────────────────────
  if (error || !item) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-4">😕</p>
          <h1 className="text-2xl font-bold mb-2">Model Not Found</h1>
          <p className="text-gray-400 mb-6">{error ?? "The item you're looking for doesn't exist."}</p>
          <Link
            href="/showcase"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Back to Showcase
          </Link>
        </div>
      </main>
    );
  }

  const categoryName = getCategoryName(item.category);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* ── Navbar ──────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
        <Link href="/showcase" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          ← Back to Showcase
        </Link>
        <Link href="/" className="text-xl font-bold text-blue-500">
          Web3D
        </Link>
      </nav>

      {/* ── Content ─────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ════════════════════════════════════════
               LEFT: 3D Viewer & Cover Image
               ════════════════════════════════════════ */}
          <div className="space-y-4">
            {/* 3D Viewer or Cover Image */}
            <div className="h-[500px] lg:h-[600px] rounded-2xl overflow-hidden border border-gray-800 bg-gray-900">
              {item.modelUrl ? (
                <Suspense fallback={<ViewerFallback />}>
                  <ModelViewer modelUrl={item.modelUrl} fallbackImage={item.coverImage} />
                </Suspense>
              ) : item.coverImage && !imageError ? (
                <div className="relative w-full h-full">
                  <img
                    src={item.coverImage}
                    alt={item.name}
                    className="w-full h-full object-contain"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <NoModelPlaceholder />
              )}
            </div>

            {/* Additional images */}
            {item.images && item.images.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {item.images.map((img, i) => (
                  <div key={i} className="h-20 rounded-lg overflow-hidden border border-gray-800 bg-gray-900">
                    <img
                      src={img}
                      alt={`${item.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════
               RIGHT: Item Details
               ════════════════════════════════════════ */}
          <div className="space-y-6">
            {/* Category Badge & Views */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
                {categoryName}
              </span>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                👁 {item.views.toLocaleString()} views
              </span>
              {item.modelUrl && (
                <span className="text-sm text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                  🧊 Interactive 3D
                </span>
              )}
            </div>

            {/* Name & Description */}
            <h1 className="text-4xl md:text-5xl font-bold">{item.name}</h1>

            {item.description && (
              <p className="text-lg text-gray-400 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Metadata */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium">{categoryName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium capitalize text-green-400">{item.status}</p>
                </div>
                <div>
                  <p className="text-gray-500">Views</p>
                  <p className="font-medium">{item.views.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">{formatDate(item.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Cover Image URL (if model loads) */}
            {item.modelUrl && (
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  🖼 Cover Image
                </h3>
                {item.coverImage && !imageError ? (
                  <div className="rounded-lg overflow-hidden border border-gray-700">
                    <img
                      src={item.coverImage}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                      onError={() => setImageError(true)}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No cover image</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link
                href="/showcase"
                className="flex-1 text-center border border-gray-700 text-gray-300 px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                ← All Models
              </Link>
              {item.modelUrl && (
                <a
                  href={item.modelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  📥 Download Model
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="text-center py-8 text-gray-600 border-t border-gray-800 mt-12">
        © 2026 Web3D Showcase | Powered by Three.js
      </footer>
    </main>
  );
}

