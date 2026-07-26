import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import User from "@/src/models/User";
import {
  requireAuth,
  requireRole,
  ApiError,
} from "@/src/lib/authGuard";
import { handleApiError } from "@/src/lib/apiError";

/**
 * GET /api/users
 *
 * Returns all users (without passwords).
 * Only accessible by admins.
 */
export async function GET(req: Request) {
  try {
    const auth = requireAuth(req);
    requireRole(auth, "admin");

    await connectDB();

    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/users
 *
 * Updates a user's role.
 * Body: { userId: string, role: "admin" | "editor" | "viewer" }
 * Only accessible by admins.
 * The last admin cannot demote themselves.
 */
export async function PATCH(req: Request) {
  try {
    const auth = requireAuth(req);
    requireRole(auth, "admin");

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, message: "userId and role are required" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "editor", "viewer"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        },
        { status: 400 }
      );
    }

    await connectDB();

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Prevent the last admin from losing admin role
    if (targetUser.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Cannot demote the last admin. Promote another user to admin first.",
          },
          { status: 400 }
        );
      }
    }

    targetUser.role = role;
    await targetUser.save();

    return NextResponse.json({
      success: true,
      message: `User "${targetUser.name}" role updated to "${role}"`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

