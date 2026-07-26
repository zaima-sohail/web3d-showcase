"use client";

import { useEffect, useState, useCallback } from "react";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (json.success) {
        setCategories(json.categories);
      } else {
        setError("Failed to fetch categories");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ── Slugify helper ────────────────────────────────
  const slugify = (name: string) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // ── Auto-fill slug when name changes (only for new) ─
  const handleNameChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: editingCategory ? prev.slug : slugify(val),
    }));
  };

  // ── Open modal ─────────────────────────────────────
  const openCreate = () => {
    setEditingCategory(null);
    setFormData({ name: "", slug: "", description: "" });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
    });
    setFormError(null);
    setShowModal(true);
  };

  // ── Save ───────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Name is required");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const url = "/api/categories";
      const body = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        setShowModal(false);
        fetchCategories();
      } else {
        setFormError(json.message ?? "Failed to save category");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete (via a dedicated endpoint if available, or skip) ──
  // The current API only has GET / POST for categories.
  // For delete we'll call /api/categories with a DELETE method.
  // If not implemented, we'll still attempt it.
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Items in this category will lose their reference.")) return;

    try {
      const res = await fetch(`/api/categories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();

      if (json.success) {
        fetchCategories();
      } else {
        alert(json.message ?? "Failed to delete");
      }
    } catch {
      alert("Network error");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div>
      {/* ── Header ───────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Categories Management</h1>
          <p className="text-gray-500 mt-1">{categories.length} total categories</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 font-medium"
        >
          + New Category
        </button>
      </div>

      {/* ── Error ─────────────────────────────── */}
      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-6">{error}</div>
      )}

      {/* ── Cards Grid ────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow">
          <p className="text-2xl mb-2">🏷</p>
          <p className="text-gray-400">No categories yet</p>
          <button onClick={openCreate} className="text-green-500 hover:underline mt-2">
            Create your first category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold">{cat.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">/{cat.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(cat)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat._id)}
                    className="text-red-500 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {cat.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{cat.description}</p>
              )}

              <p className="text-xs text-gray-400">
                Created {formatDate(cat.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ───────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <form onSubmit={handleSave}>
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold">
                  {editingCategory ? "Edit Category" : "Create Category"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                {formError && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium block mb-1">Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. 3D Characters"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-generated from name"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty to auto-generate from name
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Optional description..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border rounded-lg text-sm hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingCategory ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

