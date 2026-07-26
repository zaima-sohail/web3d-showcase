import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/src/lib/mongodb";
import Category from "@/src/models/Category";
import { handleApiError } from "@/src/lib/apiError";

const CreateCategorySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().min(2).max(60).optional(),
  description: z.string().optional(),
});

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find().sort({ name: 1 });
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    // Validate request body
    const parsed = CreateCategorySchema.parse(body);

    // Auto-generate slug from name if not provided
    const slug = parsed.slug || slugify(parsed.name);

    const category = await Category.create({
      name: parsed.name,
      slug,
      description: parsed.description || "",
    });

    return NextResponse.json(
      {
        success: true,
        category,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
