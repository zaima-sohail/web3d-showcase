import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import User from "@/src/models/User";
import { getAuthUser } from "@/src/lib/authGuard";

export async function GET(req: Request) {
  try {
    const auth = getAuthUser(req);

    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    // Re-fetch from DB (not just trusting the JWT payload) so a role change
    // or account deletion takes effect immediately instead of waiting for
    // the token to expire.
    const user = await User.findById(auth.userId).select("-password");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User no longer exists" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[me-error]", error);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}