"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ── Types ───────────────────────────────────────────────
interface UploadResult {
  success: boolean;
  message: string;
  imageUrl?: string;
  modelUrl?: string;
  publicId?: string;
  bytes?: number;
  format?: string;
}

interface UploadEntry {
  id: string;
  type: "image" | "model";
  fileName: string;
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  timestamp: number;
}

// ── Helpers ─────────────────────────────────────────────
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const generateId = () => Math.random().toString(36).substring(2, 11);

// ── Allowed file constants ──────────────────────────────
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
const MODEL_EXTENSION = ".glb";

const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MODEL_MAX_SIZE = 50 * 1024 * 1024; // 50 MB

// ── Reusable DropZone Component ─────────────────────────
function DropZone({
  accept,
  label,
  icon,
  color,
  onFileSelect,
  isDragging,
  setIsDragging,
  disabled,
  previewUrl,
}: {
  accept: string;
  label: string;
  icon: string;
  color: string;
  onFileSelect: (file: File) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  disabled: boolean;
  previewUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled, setIsDragging]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    [setIsDragging]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [disabled, onFileSelect, setIsDragging]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFileSelect]
  );

  const borderColorMap: Record<string, string> = {
    blue: "border-blue-500 bg-blue-50",
    purple: "border-purple-500 bg-purple-50",
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all duration-200 overflow-hidden
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}
        ${isDragging ? borderColorMap[color] || "border-blue-500 bg-blue-50" : "border-gray-300"}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Image Preview */}
      {previewUrl && !isDragging && (
        <div className="absolute inset-0 w-full h-full">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-contain rounded-xl"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
            <span className="text-white text-sm font-medium bg-black/60 px-4 py-2 rounded-lg">
              Click to change
            </span>
          </div>
        </div>
      )}

      {(!previewUrl || isDragging) && (
        <>
          <div className="text-5xl mb-3">{icon}</div>
          <p className="text-lg font-medium text-gray-700">
            {isDragging ? "Drop file here" : `Drop ${label} here or click to browse`}
          </p>
          <p className="text-sm text-gray-400 mt-1">{accept}</p>
        </>
      )}
    </div>
  );
}

// ── Reusable UploadHistory Component ────────────────────
function UploadHistory({
  entries,
  type,
  onClear,
  onUseInItem,
}: {
  entries: UploadEntry[];
  type: "image" | "model";
  onClear: () => void;
  onUseInItem: (entry: UploadEntry) => void;
}) {
  const filtered = entries.filter((e) => e.type === type);

  if (filtered.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Upload History ({filtered.length})
        </h4>
        <button
          onClick={onClear}
          className="text-xs text-red-500 hover:underline"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 text-sm"
          >
            {/* Thumbnail Preview */}
            {entry.type === "image" ? (
              <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-gray-200">
                <img
                  src={entry.url}
                  alt={entry.fileName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML = "🖼";
                  }}
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg shrink-0 bg-purple-100 flex items-center justify-center text-lg">
                🧊
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{entry.fileName}</p>
              <p className="text-xs text-gray-400">
                {formatBytes(entry.bytes)} · {entry.format?.toUpperCase()} ·{" "}
                {formatDate(entry.timestamp)}
              </p>
              <p className="text-xs text-blue-500 truncate">{entry.url}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onUseInItem(entry)}
                className="px-2 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100"
                title="Use in new item"
              >
                ➕ Item
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(entry.url)}
                className="px-2 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-100"
                title="Copy URL"
              >
                📋
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Toast Component ─────────────────────────────────────
function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}) {
  const bg = type === "success" ? "bg-green-600" : "bg-red-600";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 ${bg} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up`}
    >
      <span>{type === "success" ? "✅" : "❌"}</span>
      <span className="text-sm">{message}</span>
      <button onClick={onDismiss} className="ml-2 text-white/80 hover:text-white">
        ✕
      </button>
    </div>
  );
}

// ── File info card (shared between image & model) ───────
function FileInfoCard({
  fileName,
  fileSize,
  icon,
  iconBg,
  uploading,
  progress,
  onUpload,
  onClear,
  uploadLabel,
  uploadColor,
  previewUrl,
}: {
  fileName: string;
  fileSize: number;
  icon: string;
  iconBg: string;
  uploading: boolean;
  progress: number;
  onUpload: () => void;
  onClear: () => void;
  uploadLabel: string;
  uploadColor: string;
  previewUrl?: string | null;
}) {
  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {/* Preview thumbnail */}
        {previewUrl ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0">
            <img
              src={previewUrl}
              alt={fileName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center text-2xl shrink-0`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-gray-400">{formatBytes(fileSize)}</p>
        </div>
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-red-500 text-lg"
          disabled={uploading}
        >
          ✕
        </button>
      </div>

      {uploading ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-blue-600">Uploading...</span>
            <span className="text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`${uploadColor} h-2.5 rounded-full transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={onUpload}
          className={`mt-3 w-full py-2.5 ${uploadColor} text-white rounded-lg hover:opacity-90 font-medium text-sm`}
        >
          ⬆ {uploadLabel}
        </button>
      )}
    </div>
  );
}

// ── Upload result card ──────────────────────────────────
function UploadResultCard({
  url,
  format,
  bytes,
  onCopy,
}: {
  url: string;
  format?: string;
  bytes: number;
  onCopy: () => void;
}) {
  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-sm text-green-700 font-medium mb-2">
        ✅ Uploaded successfully!
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 text-xs bg-white border rounded px-2 py-1.5 text-gray-600 truncate"
        />
        <button
          onClick={onCopy}
          className="shrink-0 px-3 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-100"
        >
          📋 Copy
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {format?.toUpperCase()} · {formatBytes(bytes)}
      </p>
    </div>
  );
}

// ── Category type for item form ─────────────────────────
interface Category {
  _id: string;
  name: string;
}

// ── Quick Item Create Modal ─────────────────────────────
function QuickItemModal({
  show,
  onClose,
  initialCoverImage,
  initialModelUrl,
  onCreated,
}: {
  show: boolean;
  onClose: () => void;
  initialCoverImage: string;
  initialModelUrl: string;
  onCreated: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    tags: "",
    status: "draft" as "draft" | "published",
    coverImage: initialCoverImage,
    modelUrl: initialModelUrl,
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      coverImage: initialCoverImage,
      modelUrl: initialModelUrl,
    }));
  }, [initialCoverImage, initialModelUrl]);

  useEffect(() => {
    if (!show) return;
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategories(json.categories);
      })
      .catch(() => {});
  }, [show]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const body = {
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      tags: formData.tags
        ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
      status: formData.status,
      coverImage: formData.coverImage || undefined,
      modelUrl: formData.modelUrl || undefined,
    };

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        onCreated();
        onClose();
      } else {
        setFormError(json.message ?? json.errors?.message ?? "Validation error");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSave}>
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold">Create Item from Upload</h2>
            <button
              type="button"
              onClick={onClose}
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. 3d, model, furniture"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "draft" | "published",
                  })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            {/* Pre-filled Cover Image */}
            <div>
              <label className="text-sm font-medium block mb-1">Cover Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.coverImage && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100 border">
                    <img
                      src={formData.coverImage}
                      alt="preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Pre-filled Model URL */}
            <div>
              <label className="text-sm font-medium block mb-1">Model URL (GLB)</label>
              <input
                type="text"
                value={formData.modelUrl}
                onChange={(e) => setFormData({ ...formData, modelUrl: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border rounded-lg text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────
export default function UploadsPage() {
  // ── Upload state ───────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<File | null>(null);

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [modelPreviewUrl, setModelPreviewUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState<"image" | "model" | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [lastUploadedType, setLastUploadedType] = useState<"image" | "model" | null>(null);

  // Drag state
  const [imageDragging, setImageDragging] = useState(false);
  const [modelDragging, setModelDragging] = useState(false);

  // History
  const [history, setHistory] = useState<UploadEntry[]>([]);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Quick Item Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemModalData, setItemModalData] = useState({
    coverImage: "",
    modelUrl: "",
  });

  // ── Validation helpers ─────────────────────────────────
  const validateImage = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext) && !IMAGE_TYPES.includes(file.type)) {
      return "Invalid image type. Allowed: JPG, PNG, WebP, GIF, SVG.";
    }
    if (file.size > IMAGE_MAX_SIZE) {
      return `Image too large (max ${IMAGE_MAX_SIZE / 1024 / 1024} MB).`;
    }
    return null;
  };

  const validateModel = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (ext !== MODEL_EXTENSION) {
      return "Only .glb files are allowed.";
    }
    if (file.size > MODEL_MAX_SIZE) {
      return `Model too large (max ${MODEL_MAX_SIZE / 1024 / 1024} MB).`;
    }
    return null;
  };

  // ── Generate local preview URLs ────────────────────────
  const generatePreviewUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  // ── File selection handlers ────────────────────────────
  const handleImageSelect = (file: File) => {
    const error = validateImage(file);
    if (error) {
      setToast({ message: error, type: "error" });
      return;
    }
    setSelectedImage(file);
    // Revoke old preview URL to avoid memory leaks
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(generatePreviewUrl(file));
    setUploadResult(null);
    setLastUploadedType(null);
  };

  const handleModelSelect = (file: File) => {
    const error = validateModel(file);
    if (error) {
      setToast({ message: error, type: "error" });
      return;
    }
    setSelectedModel(file);
    if (modelPreviewUrl) URL.revokeObjectURL(modelPreviewUrl);
    setModelPreviewUrl(generatePreviewUrl(file));
    setUploadResult(null);
    setLastUploadedType(null);
  };

  // ── Upload handler (supports XMLHttpRequest for progress) ──
  const handleUpload = async (type: "image" | "model") => {
    const file = type === "image" ? selectedImage : selectedModel;
    if (!file) return;

    setUploading(type);
    setProgress(0);
    setUploadResult(null);

    const endpoint = type === "image" ? "/api/upload/image" : "/api/upload/model";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          try {
            const json = JSON.parse(xhr.responseText);
            resolve(json);
          } catch {
            reject(new Error("Invalid response"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

        xhr.open("POST", endpoint);
        xhr.send(formData);
      });

      if (result.success) {
        setUploadResult(result);
        setLastUploadedType(type);
        const url = type === "image" ? result.imageUrl! : result.modelUrl!;
        const newEntry: UploadEntry = {
          id: generateId(),
          type,
          fileName: file.name,
          url,
          publicId: result.publicId ?? "",
          bytes: result.bytes ?? file.size,
          format: result.format ?? file.name.split(".").pop() ?? "",
          timestamp: Date.now(),
        };
        setHistory((prev) => [newEntry, ...prev]);

        setToast({
          message: `${type === "image" ? "Image" : "Model"} uploaded successfully!`,
          type: "success",
        });

        // Clear selection but keep preview as the uploaded result
        if (type === "image") {
          setSelectedImage(null);
        } else {
          setSelectedModel(null);
        }
      } else {
        setToast({
          message: result.message ?? "Upload failed",
          type: "error",
        });
      }
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Upload failed",
        type: "error",
      });
    } finally {
      setUploading(null);
      setProgress(0);
    }
  };

  // ── Clear history ──────────────────────────────────────
  const clearHistory = (type: "image" | "model") => {
    setHistory((prev) => prev.filter((e) => e.type !== type));
  };

  // ── Use in item handler ────────────────────────────────
  const handleUseInItem = (entry: UploadEntry) => {
    setItemModalData({
      coverImage: entry.type === "image" ? entry.url : "",
      modelUrl: entry.type === "model" ? entry.url : "",
    });
    setShowItemModal(true);
  };

  // ── Cleanup preview URLs on unmount ───────────────────
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (modelPreviewUrl) URL.revokeObjectURL(modelPreviewUrl);
    };
  }, [imagePreviewUrl, modelPreviewUrl]);

  const imageHistory = history.filter((e) => e.type === "image");
  const modelHistory = history.filter((e) => e.type === "model");

  return (
    <div>
      {/* ── Header ───────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Uploads</h1>
          <p className="mt-1 text-gray-500">
            Upload images and 3D models to Cloudinary
          </p>
        </div>
        <div className="flex gap-2 text-sm text-gray-400">
          <span>📷 Images: {imageHistory.length}</span>
          <span>·</span>
          <span>🧊 Models: {modelHistory.length}</span>
        </div>
      </div>

      {/* ── Two-column layout ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ═══════════════════════════════════════════════
               📷 IMAGE UPLOAD SECTION
               ═══════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 text-blue-600 text-2xl w-12 h-12 rounded-xl flex items-center justify-center">
              📷
            </div>
            <div>
              <h2 className="text-xl font-bold">Image Upload</h2>
              <p className="text-sm text-gray-400">
                JPG, PNG, WebP, GIF, SVG · Max 10 MB
              </p>
            </div>
          </div>

          {/* Drop Zone */}
          <DropZone
            accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
            label="an image"
            icon="📷"
            color="blue"
            onFileSelect={handleImageSelect}
            isDragging={imageDragging}
            setIsDragging={setImageDragging}
            disabled={uploading === "image"}
            previewUrl={imagePreviewUrl && !uploadResult?.success ? imagePreviewUrl : null}
          />

          {/* Selected file info card */}
          {selectedImage && (
            <FileInfoCard
              fileName={selectedImage.name}
              fileSize={selectedImage.size}
              icon="📷"
              iconBg="bg-blue-100"
              uploading={uploading === "image"}
              progress={progress}
              onUpload={() => handleUpload("image")}
              onClear={() => {
                setSelectedImage(null);
                if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                setImagePreviewUrl(null);
                setUploadResult(null);
                setLastUploadedType(null);
              }}
              uploadLabel="Upload Image"
              uploadColor="bg-blue-600"
              previewUrl={imagePreviewUrl}
            />
          )}

          {/* Upload result */}
          {uploadResult && uploadResult.success && uploadResult.imageUrl && lastUploadedType === "image" && (
            <>
              {/* Uploaded image preview */}
              <div className="mt-4 rounded-lg overflow-hidden border border-green-200">
                <img
                  src={uploadResult.imageUrl}
                  alt="Uploaded"
                  className="w-full h-48 object-contain bg-gray-50"
                />
              </div>
              <UploadResultCard
                url={uploadResult.imageUrl}
                format={uploadResult.format}
                bytes={uploadResult.bytes ?? 0}
                onCopy={() => {
                  navigator.clipboard.writeText(uploadResult.imageUrl!);
                  setToast({ message: "URL copied!", type: "success" });
                }}
              />
            </>
          )}

          {/* Image History */}
          <UploadHistory
            entries={history}
            type="image"
            onClear={() => clearHistory("image")}
            onUseInItem={handleUseInItem}
          />
        </div>

        {/* ═══════════════════════════════════════════════
               📦 GLB MODEL UPLOAD SECTION
               ═══════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 text-purple-600 text-2xl w-12 h-12 rounded-xl flex items-center justify-center">
              📦
            </div>
            <div>
              <h2 className="text-xl font-bold">GLB Model Upload</h2>
              <p className="text-sm text-gray-400">
                .glb files only · Max 50 MB
              </p>
            </div>
          </div>

          {/* Drop Zone */}
          <DropZone
            accept=".glb"
            label="a GLB model"
            icon="🧊"
            color="purple"
            onFileSelect={handleModelSelect}
            isDragging={modelDragging}
            setIsDragging={setModelDragging}
            disabled={uploading === "model"}
          />

          {/* Selected file info card */}
          {selectedModel && (
            <FileInfoCard
              fileName={selectedModel.name}
              fileSize={selectedModel.size}
              icon="🧊"
              iconBg="bg-purple-100"
              uploading={uploading === "model"}
              progress={progress}
              onUpload={() => handleUpload("model")}
              onClear={() => {
                setSelectedModel(null);
                if (modelPreviewUrl) URL.revokeObjectURL(modelPreviewUrl);
                setModelPreviewUrl(null);
                setUploadResult(null);
                setLastUploadedType(null);
              }}
              uploadLabel="Upload Model"
              uploadColor="bg-purple-600"
            />
          )}

          {/* Result */}
          {uploadResult && uploadResult.success && uploadResult.modelUrl && lastUploadedType === "model" && (
            <div className="mt-4 space-y-3">
              {/* 3D Model Preview Placeholder */}
              <div className="rounded-lg overflow-hidden border border-purple-200 bg-purple-50 flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="text-6xl mb-2">🧊</div>
                  <p className="text-sm text-purple-600 font-medium">GLB Model</p>
                  <p className="text-xs text-purple-400">
                    {uploadResult.format?.toUpperCase()}
                  </p>
                </div>
              </div>
              <UploadResultCard
                url={uploadResult.modelUrl}
                format={uploadResult.format}
                bytes={uploadResult.bytes ?? 0}
                onCopy={() => {
                  navigator.clipboard.writeText(uploadResult.modelUrl!);
                  setToast({ message: "URL copied!", type: "success" });
                }}
              />
            </div>
          )}

          {/* Model History */}
          <UploadHistory
            entries={history}
            type="model"
            onClear={() => clearHistory("model")}
            onUseInItem={handleUseInItem}
          />
        </div>
      </div>

      {/* ── Global Stats ─────────────────────── */}
      {history.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-3">📊 Session Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {imageHistory.length}
              </p>
              <p className="text-gray-500">Images Uploaded</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {modelHistory.length}
              </p>
              <p className="text-gray-500">Models Uploaded</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatBytes(
                  history.reduce((acc, e) => acc + e.bytes, 0)
                )}
              </p>
              <p className="text-gray-500">Total Size</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {history.length}
              </p>
              <p className="text-gray-500">Total Files</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Item Create Modal ──────────── */}
      <QuickItemModal
        show={showItemModal}
        onClose={() => {
          setShowItemModal(false);
          setItemModalData({ coverImage: "", modelUrl: "" });
        }}
        initialCoverImage={itemModalData.coverImage}
        initialModelUrl={itemModalData.modelUrl}
        onCreated={() => {
          setToast({ message: "Item created successfully!", type: "success" });
        }}
      />

      {/* ── Toast ─────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* ── Animation keyframes ──────────────── */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

