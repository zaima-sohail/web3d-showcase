"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ───────────────────────────────────────────────
interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  createdAt: string;
}

const VALID_ROLES = ["admin", "editor", "viewer"] as const;
type Role = (typeof VALID_ROLES)[number];

const ROLE_BADGES: Record<Role, string> = {
  admin: "bg-red-100 text-red-700",
  editor: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-700",
};

// ── Helpers ─────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// ── Page ────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Change-role modal state
  const [modalUser, setModalUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("viewer");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // ── Fetch users ──────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? "Failed to load users");
        return;
      }

      if (json.success) {
        setUsers(json.users);
      } else {
        setError(json.message ?? "Failed to load users");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Open role change modal ───────────────────────────
  const openRoleModal = (user: User) => {
    setModalUser(user);
    setSelectedRole(user.role);
    setModalError(null);
  };

  // ── Save role change ─────────────────────────────────
  const handleRoleChange = async () => {
    if (!modalUser || selectedRole === modalUser.role) {
      setModalUser(null);
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: modalUser._id, role: selectedRole }),
      });

      const json = await res.json();

      if (json.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === modalUser._id ? { ...u, role: selectedRole } : u
          )
        );
        setModalUser(null);
      } else {
        setModalError(json.message ?? "Failed to update role");
      }
    } catch {
      setModalError("Network error");
    } finally {
      setSaving(false);
    }
  };

  // ── Current user (for disabling self-demotion) ───────
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Try to get current user info from /api/auth/me
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCurrentUserId(json.user.id);
      })
      .catch(() => {});
  }, []);

  // ── Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 text-lg">⚠ {error}</p>
        <button
          onClick={fetchUsers}
          className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ───────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-gray-500 mt-1">{users.length} total users</p>
        </div>
      </div>

      {/* ── Table ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-2xl mb-2">👥</p>
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          ROLE_BADGES[user.role]
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openRoleModal(user)}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Change Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Change Role Modal ─────────────────── */}
      {modalUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Change Role</h2>
              <button
                type="button"
                onClick={() => setModalUser(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
                  {modalError}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium">{modalUser.name}</p>
                <p className="text-sm text-gray-500">{modalUser.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Current role:{" "}
                  <span
                    className={`font-semibold ${
                      ROLE_BADGES[modalUser.role]
                    } px-1.5 py-0.5 rounded`}
                  >
                    {modalUser.role}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  New Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {VALID_ROLES.map((role) => {
                    const isCurrent = role === modalUser.role;
                    const isSelected = role === selectedRole;
                    const isSelf =
                      modalUser._id === currentUserId &&
                      modalUser.role === "admin" &&
                      role !== "admin";

                    return (
                      <button
                        key={role}
                        disabled={isCurrent || isSelf}
                        onClick={() => setSelectedRole(role)}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300"
                        } ${
                          isCurrent
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        } ${
                          isSelf
                            ? "opacity-40 cursor-not-allowed line-through"
                            : ""
                        }`}
                        title={
                          isSelf
                            ? "You cannot demote yourself as the last admin"
                            : isCurrent
                            ? "Already this role"
                            : `Set as ${role}`
                        }
                      >
                        <span className="block capitalize">{role}</span>
                        {isCurrent && (
                          <span className="block text-[10px] text-gray-400 mt-0.5">
                            current
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setModalUser(null)}
                className="px-5 py-2.5 border rounded-lg text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  saving ||
                  selectedRole === modalUser.role ||
                  (modalUser._id === currentUserId &&
                    modalUser.role === "admin" &&
                    selectedRole !== "admin")
                }
                onClick={handleRoleChange}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Update Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

