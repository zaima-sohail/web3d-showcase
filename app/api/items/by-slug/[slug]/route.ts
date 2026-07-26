 import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Item from "@/src/models/Item";
import Category from "@/src/models/Category";
import Photo from "@/src/models/Photo";
import Model3D from "@/src/models/Model3D";
import { requireAuth, requireRole } from "@/src/lib/authGuard";
import { handleApiError } from "@/src/lib/apiError";
import { UpdateItemSchema } from "@/src/lib/validations/item";
import { emitActivity } from "@/src/lib/socket";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// --- GET /api/items/by-slug/[slug] — public showcase page data ---
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    await connectDB();

    const { slug } = await params;
    const item = await Item.findOne({ slug, status: "published" }).populate("category", "name slug");
    if (!item) {
      return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
    }

    const [photos, models] = await Promise.all([
      Photo.find({ item: item._id }).sort({ order: 1 }),
      Model3D.find({ item: item._id }),
    ]);

    // Fire-and-forget view increment — doesn't block the response.
    void Item.updateOne({ _id: item._id }, { $inc: { views: 1 } }).exec();

    emitActivity({
      kind: "VIEWED",
      itemId: String(item._id),
      itemName: item.name,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, item, photos, models });
  } catch (error) {
    return handleApiError(error);
  }
}

// --- PATCH /api/items/by-slug/[slug] — admin/editor: update fields or change status ---
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const user = requireAuth(req);
    requireRole(user, "admin", "editor");

    await connectDB();
    const body = await req.json();
    const input = UpdateItemSchema.parse(body);

    const { slug } = await params;
    const item = await Item.findOneAndUpdate({ slug }, input, { new: true });
    if (!item) {
      return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
    }

    if (input.status === "published") {
      emitActivity({
        kind: "PUBLISHED",
        itemId: String(item._id),
        itemName: item.name,
        at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    return handleApiError(error);
  }
}

// --- DELETE /api/items/by-slug/[slug] — admin only ---
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user = requireAuth(req);
    requireRole(user, "admin");

    await connectDB();
    const { slug } = await params;
    const item = await Item.findOne({ slug });
    if (!item) {
      return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
    }

    // Clean up related photos/models so nothing is orphaned in the DB.
    await Promise.all([
      Photo.deleteMany({ item: item._id }),
      Model3D.deleteMany({ item: item._id }),
      Item.deleteOne({ _id: item._id }),
    ]);

    emitActivity({
      kind: "ITEM_DELETED",
      itemId: String(item._id),
      itemName: item.name,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Item deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

