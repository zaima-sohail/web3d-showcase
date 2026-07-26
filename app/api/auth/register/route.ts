import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import User from "@/src/models/User";
import { RegisterSchema } from "@/src/lib/validations/auth";
import { hashPassword } from "@/src/lib/hash";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const result = RegisterSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    const exists = await User.findOne({ email });

    if (exists) {
      return NextResponse.json(
        { success: false, message: "Email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    return NextResponse.json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

