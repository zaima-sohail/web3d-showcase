import { verifyToken } from "./jwt";

export interface AuthUser {
  userId: string;
  role: string;
}

/**
 * Extracts JWT from the Authorization header (Bearer token) or from
 * the "token" cookie (set on login). Throws ApiError if none is found
 * or if the token is invalid.
 */
export function requireAuth(req?: Request): AuthUser {
  const token = extractToken(req);
  if (!token) {
    throw new ApiError("Unauthorized: No token provided", 401);
  }

  try {
    const decoded = verifyToken(token) as AuthUser;
    return decoded;
  } catch {
    throw new ApiError("Unauthorized: Invalid token", 401);
  }
}

/**
 * Same as requireAuth but returns null instead of throwing on failure.
 */
export function getAuthUser(req?: Request): AuthUser | null {
  try {
    return requireAuth(req);
  } catch {
    return null;
  }
}

export function requireRole(user: AuthUser, ...roles: string[]) {
  if (!roles.includes(user.role)) {
    throw new ApiError("Forbidden: Insufficient permissions", 403);
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// ── helpers ──────────────────────────────────────────────

function extractToken(req?: Request): string | null {
  if (!req) return null;

  // 1. Authorization header (Bearer <token>)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // 2. Cookie header ("token=…")
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

