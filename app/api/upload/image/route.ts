import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/src/lib/cloudinary";
import { requireAuth, getAuthUser } from "@/src/lib/authGuard";

// ── Constants ───────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "svg"];

// ── Route config (App Router) ───────────────────────────
export const runtime = "nodejs";

// ── Helpers ─────────────────────────────────────────────
function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function validateFile(file: File): string | null {
  // 1. Size check
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`;
  }

  // 2. MIME type check
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Invalid file type "${file.type}". Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`;
  }

  // 3. Extension check
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Invalid file extension ".${ext}". Allowed: .${ALLOWED_EXTENSIONS.join(", .")}`;
  }

  return null;
}

// ── POST handler ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // ── 1. Authentication (optional – uncomment to require login) ──
    // const user = requireAuth(req);

    // ── 2. Content-Type check ─────────────────────────────
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Content-Type. Expected 'multipart/form-data'.",
          received: contentType,
        },
        { status: 400 }
      );
    }

    // ── 3. Parse form data ────────────────────────────────
    const formData = await req.formData();

    // Log all received fields for debugging
    const receivedFields: Record<string, string> = {};
    const receivedFiles: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        receivedFiles[key] = `${value.name} (${(value.size / 1024).toFixed(1)} KB, ${value.type})`;
      } else {
        receivedFields[key] = String(value);
      }
    }

    // ── 4. Try to get the file (support multiple field names) ──
    let file: File | null = null;
    const fieldNames = ["file", "image", "upload", "files", "media", "avatar"];

    for (const name of fieldNames) {
      const candidate = formData.get(name);
      if (candidate instanceof File && candidate.size > 0) {
        file = candidate;
        break;
      }
    }

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No file uploaded. Use form-data with one of these field names: " +
            fieldNames.join(", "),
          debug: {
            receivedFields,
            receivedFiles,
            fieldCount: Array.from(formData.entries()).length,
          },
        },
        { status: 400 }
      );
    }

    // ── 5. Validate file ───────────────────────────────────
    const validationError = validateFile(file);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          message: validationError,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
          },
        },
        { status: 400 }
      );
    }

    // ── 6. Upload to Cloudinary ────────────────────────────
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "web3d-showcase",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Upload failed. Server error.",
      },
      { status: 500 }
    );
  }
}
