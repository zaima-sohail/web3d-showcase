"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// ── Types ───────────────────────────────────────────────
interface DashboardData {
  overview: {
    totalItems: number;
    totalCategories: number;
    publishedItems: number;
    draftItems: number;
    totalUsers: number;
    totalViews: number;
  };
  charts: {
    categoryDistribution: { categoryName: string; count: number }[];
    monthlyTrends: { year: number; month: number; total: number; published: number; draft: number }[];
  };
  insights: {
    topViewedItems: { _id: string; name: string; views: number; status: string; categoryName: string; createdAt: string }[];
    assetSummary: { type: string; totalAssets: number; totalSize: number }[];
  };
  activity: { _id: string; user: string; action: string; item: string; timestamp: string }[];
}

interface JobProgressPayload {
  jobId: string;
  fileName: string;
  type: "IMAGE_PROCESSING" | "MODEL_OPTIMIZATION";
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  progress: number;
  errorMsg?: string;
}

interface ActivityPayload {
  kind: "PUBLISHED" | "VIEWED" | "ITEM_CREATED" | "ITEM_DELETED";
  itemId: string;
  itemName: string;
  at: string;
}

// ── Helpers ─────────────────────────────────────────────
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (ts: string) => {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const monthLabel = (y: number, m: number) => {
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

// ── Live Pulse Dot ──────────────────────────────────────
function LivePulseDot() {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
    </span>
  );
}

// ── Activity Badge ──────────────────────────────────────
function ActivityBadge({ kind }: { kind: string }) {
  const colors: Record<string, string> = {
    ITEM_CREATED: "bg-green-100 text-green-700",
    ITEM_DELETED: "bg-red-100 text-red-700",
    PUBLISHED: "bg-blue-100 text-blue-700",
    VIEWED: "bg-purple-100 text-purple-700",
  };
  const labels: Record<string, string> = {
    ITEM_CREATED: "Created",
    ITEM_DELETED: "Deleted",
    PUBLISHED: "Published",
    VIEWED: "Viewed",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[kind] || "bg-gray-100 text-gray-700"}`}>
      {labels[kind] || kind}
    </span>
  );
}

// ── Job Progress Bar ────────────────────────────────────
function JobProgressCard({ job }: { job: JobProgressPayload }) {
  const statusColors: Record<string, string> = {
    QUEUED: "bg-yellow-500",
    PROCESSING: "bg-blue-500",
    DONE: "bg-green-500",
    FAILED: "bg-red-500",
  };
  const statusIcons: Record<string, string> = {
    QUEUED: "⏳",
    PROCESSING: "🔄",
    DONE: "✅",
    FAILED: "❌",
  };

  return (
    <div className="bg-white border rounded-lg p-3 flex items-center gap-3 text-sm">
      <span className="text-lg">{statusIcons[job.status] || "📋"}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{job.fileName}</p>
        <p className="text-xs text-gray-400">
          {job.type === "IMAGE_PROCESSING" ? "🖼 Image" : "🧊 Model"} · {job.status}
          {job.errorMsg && <span className="text-red-500 ml-1">· {job.errorMsg}</span>}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
          <div
            className={`${statusColors[job.status] || "bg-gray-400"} h-1.5 rounded-full transition-all duration-300`}
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-400 shrink-0">{job.progress}%</span>
    </div>
  );
}

// ── Main Dashboard Page ─────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Socket.IO state
  const [connected, setConnected] = useState(false);
  const [liveActivity, setLiveActivity] = useState<ActivityPayload[]>([]);
  const [liveJobs, setLiveJobs] = useState<JobProgressPayload[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // ── Fetch initial data ────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.message ?? "Failed to load dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Socket.IO Connection ──────────────────────────────
  useEffect(() => {
    // Get JWT token from localStorage (set by login page)
    // httpOnly cookie is not readable by JS, so we use localStorage
    const token = localStorage.getItem("token");

    if (!token) {
      console.warn("[dashboard] No auth token found for Socket.IO connection");
      return;
    }

    const socket = io(window.location.origin, {
      path: "/ws",
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("[dashboard] Socket.IO connected:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[dashboard] Socket.IO disconnected");
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("[dashboard] Socket.IO connection error:", err.message);
      setConnected(false);
    });

    // Listen for live activity
    socket.on("activity:new", (payload: ActivityPayload) => {
      console.log("[dashboard] Live activity:", payload);
      setLiveActivity((prev) => [payload, ...prev].slice(0, 20));

      // Update overview counts optimistically
      if (payload.kind === "ITEM_CREATED") {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            overview: {
              ...prev.overview,
              totalItems: prev.overview.totalItems + 1,
              draftItems: prev.overview.draftItems + 1,
            },
            activity: [
              {
                _id: `live-${payload.at}-${payload.itemId}`,
                user: "System",
                action: payload.kind,
                item: payload.itemName,
                timestamp: payload.at,
              },
              ...prev.activity,
            ],
          };
        });
      }

      if (payload.kind === "ITEM_DELETED") {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            overview: {
              ...prev.overview,
              totalItems: Math.max(0, prev.overview.totalItems - 1),
            },
            activity: [
              {
                _id: `live-${payload.at}-${payload.itemId}`,
                user: "System",
                action: payload.kind,
                item: payload.itemName,
                timestamp: payload.at,
              },
              ...prev.activity,
            ],
          };
        });
      }
    });

    // Listen for job progress
    socket.on("job:progress", (payload: JobProgressPayload) => {
      console.log("[dashboard] Job progress:", payload);
      setLiveJobs((prev) => {
        const existing = prev.findIndex((j) => j.jobId === payload.jobId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = payload;
          // Remove completed/failed jobs after a delay
          if (payload.status === "DONE" || payload.status === "FAILED") {
            setTimeout(() => {
              setLiveJobs((p) => p.filter((j) => j.jobId !== payload.jobId));
            }, 5000);
          }
          return updated;
        }
        return [payload, ...prev].slice(0, 10);
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Loading State ─────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────
  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 text-lg">⚠ {error ?? "Failed to load dashboard"}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { overview, charts, insights, activity } = data;

  // Combine server activity with live activity
  const allActivity = [
    ...liveActivity.map((a) => ({
      _id: `live-${a.at}-${a.itemId}`,
      user: "System",
      action: a.kind,
      item: a.itemName,
      timestamp: a.at,
    })),
    ...activity,
  ];

  const cards = [
    { label: "Total Items", value: overview.totalItems, icon: "📦", color: "bg-blue-500" },
    { label: "Total Categories", value: overview.totalCategories, icon: "🏷", color: "bg-green-500" },
    { label: "Total Views", value: overview.totalViews.toLocaleString(), icon: "👁", color: "bg-purple-500" },
    { label: "Published", value: overview.publishedItems, icon: "✅", color: "bg-emerald-500" },
    { label: "Draft", value: overview.draftItems, icon: "📝", color: "bg-amber-500" },
    { label: "Total Users", value: overview.totalUsers, icon: "👥", color: "bg-rose-500" },
  ];

  return (
    <div>
      {/* ── Header ───────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold">Dashboard</h1>
            {connected && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <LivePulseDot />
                Live
              </span>
            )}
            {!connected && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border">
                <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                Offline
              </span>
            )}
          </div>
          <p className="mt-1 text-gray-500">Welcome Admin 👋</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm flex items-center gap-2"
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Live Jobs ────────────────────────── */}
      {liveJobs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <LivePulseDot />
            Live Jobs ({liveJobs.length})
          </h3>
          <div className="space-y-2">
            {liveJobs.slice(0, 3).map((job) => (
              <JobProgressCard key={job.jobId} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* ── Stats Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow p-6 flex items-center gap-5 transition-all hover:shadow-lg"
          >
            <div className={`${card.color} text-white text-2xl w-14 h-14 rounded-xl flex items-center justify-center shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className="text-gray-500 text-sm">{card.label}</p>
              <p className="text-3xl font-bold">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Category Distribution ───────────────────── */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">📊 Category Distribution</h2>
        {charts.categoryDistribution.length === 0 ? (
          <p className="text-gray-400 text-sm">No items categorized yet.</p>
        ) : (
          <div className="space-y-3">
            {charts.categoryDistribution.map((cat) => {
              const max = Math.max(...charts.categoryDistribution.map((c) => c.count));
              const pct = (cat.count / max) * 100;
              return (
                <div key={cat.categoryName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat.categoryName}</span>
                    <span className="font-semibold">{cat.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Monthly Trends ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📈 Monthly Trends (12mo)</h2>
          {charts.monthlyTrends.length === 0 ? (
            <p className="text-gray-400 text-sm">No data for the last 12 months.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Month</th>
                    <th className="pb-2">Total</th>
                    <th className="pb-2 text-green-600">Published</th>
                    <th className="pb-2 text-amber-600">Draft</th>
                  </tr>
                </thead>
                <tbody>
                  {charts.monthlyTrends.map((m) => (
                    <tr key={`${m.year}-${m.month}`} className="border-b border-gray-100">
                      <td className="py-2">{monthLabel(m.year, m.month)}</td>
                      <td className="py-2 font-semibold">{m.total}</td>
                      <td className="py-2 text-green-600">{m.published}</td>
                      <td className="py-2 text-amber-600">{m.draft}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Top Viewed Items ────────────────────────── */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🏆 Top Viewed Items</h2>
          {insights.topViewedItems.length === 0 ? (
            <p className="text-gray-400 text-sm">No items available.</p>
          ) : (
            <div className="space-y-4">
              {insights.topViewedItems.map((item, i) => (
                <div key={item._id} className="flex items-center gap-4">
                  <span className="text-lg font-bold text-gray-300 w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {item.categoryName} · {item.status}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-purple-600 shrink-0">
                    {item.views.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Asset Summary + Recent Activity ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">💾 Asset Storage</h2>
          {insights.assetSummary.length === 0 ? (
            <p className="text-gray-400 text-sm">No assets uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {insights.assetSummary.map((a) => (
                <div key={a.type} className="flex justify-between items-center border-b pb-2">
                  <span className="capitalize">{a.type}</span>
                  <div className="text-right">
                    <p className="font-semibold">{a.totalAssets} files</p>
                    <p className="text-xs text-gray-400">{formatBytes(a.totalSize)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">🕐 Recent Activity</h2>
            {liveActivity.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium animate-pulse">
                +{liveActivity.length} new
              </span>
            )}
          </div>
          {allActivity.length === 0 ? (
            <p className="text-gray-400 text-sm">No recent activity.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {allActivity.map((a) => (
                <div key={a._id} className="flex items-start gap-3 border-b pb-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm shrink-0">
                    {a.user?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm flex items-center gap-2">
                      <span className="font-medium">{a.user}</span>{" "}
                      <ActivityBadge kind={a.action} />{" "}
                      <span className="font-medium">{a.item}</span>
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(a.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

