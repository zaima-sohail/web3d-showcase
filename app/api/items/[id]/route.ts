import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Item from "@/src/models/Item";
import Category from "@/src/models/Category";
import { UpdateItemSchema } from "@/src/lib/validations/item";
import { handleApiError } from "@/src/lib/apiError";
import { emitActivity } from "@/src/lib/socket";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const item = await Item.findById(id).populate("category");

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          message: "Item not found",
        },
        { status: 404 }
      );
    }

    // Increment view count (fire-and-forget)
    void Item.updateOne({ _id: id }, { $inc: { views: 1 } }).exec();

    return NextResponse.json({
      success: true,
      item,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const body = await req.json();

    const validation = UpdateItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const item = await Item.findByIdAndUpdate(id, validation.data, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          message: "Item not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      item,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const item = await Item.findByIdAndDelete(id);

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          message: "Item not found",
        },
        { status: 404 }
      );
    }

    // ── Emit Socket.IO event for live dashboard ──────
    emitActivity({
      kind: "ITEM_DELETED",
      itemId: id,
      itemName: item.name,
      at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Item Deleted",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
