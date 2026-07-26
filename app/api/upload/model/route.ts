import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/src/lib/cloudinary";
import { getAuthUser } from "@/src/lib/authGuard";

// ── Constants ───────────────────────────────────────────
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTENSIONS = ["glb"];
const ALLOWED_MIME_TYPES = [
  "model/gltf-binary",
  "model/gltf+json",
  "application/octet-stream",
];

// ── Route config (App Router) ───────────────────────────
export const runtime = "nodejs";

// ── Helpers ─────────────────────────────────────────────

/**
 * Duck-type check for File/Blob objects.
 * Avoids `instanceof File` which can fail across JS realm boundaries
 * (e.g., in Next.js App Route handlers where File comes from a different
 * Node.js / Edge VM context).
 */
function isFormDataFile(value: unknown): value is File {
  return (
    value !== null &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    typeof (value as any).arrayBuffer === "function" &&
    "size" in value &&
    typeof (value as any).size === "number" &&
    "name" in value &&
    "type" in value
  );
}

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function validateFile(file: File): string | null {
  // 1. Size check
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`;
  }

  // 2. Extension check
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Invalid file extension ".${ext}". Only .glb files are allowed.`;
  }

  return null;
}

// ── POST handler ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // ── 1. Authentication (optional – uncomment to require login) ──
    // const user = getAuthUser(req);

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
      if (isFormDataFile(value)) {
        receivedFiles[key] = `${value.name} (${(value.size / 1024).toFixed(1)} KB, ${value.type})`;
      } else {
        receivedFields[key] = String(value);
      }
    }

    // ── 4. Try to get the file (support multiple field names) ──
    let file: File | null = null;
    const fieldNames = ["file", "model", "upload", "glb", "image"];

    for (const name of fieldNames) {
      const candidate = formData.get(name);
      if (isFormDataFile(candidate) && candidate.size > 0) {
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
            folder: "web3d-showcase/models",
            resource_type: "raw",
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
      message: "Model uploaded successfully",
      modelUrl: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format,
    });
  } catch (error) {
    console.error("Model upload error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Model upload failed",
      },
      { status: 500 }
    );
  }
}
