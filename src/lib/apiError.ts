import { NextResponse } from "next/server";
import { ApiError } from "./authGuard";

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status }
    );
  }

  if (error instanceof Error) {
    // Zod validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error },
        { status: 400 }
      );
    }

    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server Error" },
      { status: 500 }
    );
  }

  console.error("Unknown API Error:", error);
  return NextResponse.json(
    { success: false, message: "Server Error" },
    { status: 500 }
  );
}

