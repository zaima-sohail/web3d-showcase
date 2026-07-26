import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import User from "@/src/models/User";
import { LoginSchema } from "@/src/lib/validations/auth";
import { comparePassword } from "@/src/lib/hash";
import { generateToken } from "@/src/lib/jwt";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const result = LoginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = generateToken({ userId: user._id, role: user.role });

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      // Token still returned in body too, useful for Postman/mobile clients
      // that can't rely on browser cookies. Browser-based admin panel should
      // use the cookie only and ignore this field.
      token,
    });

    // httpOnly => JS on the page can never read this (XSS protection).
    // secure => only sent over HTTPS in production.
    // sameSite: "lax" => blocks it being sent on cross-site requests (CSRF protection).
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days, matches JWT expiresIn
    });

    return response;
  } catch (error) {
    console.error("[login-error]", error);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}