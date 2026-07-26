import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Item from "@/src/models/Item";
import Category from "@/src/models/Category";
import { ItemSchema } from "@/src/lib/validations/item";
import { handleApiError } from "@/src/lib/apiError";
import { emitActivity } from "@/src/lib/socket";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const validation = ItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const item = await Item.create(validation.data);

    // ── Emit Socket.IO event for live dashboard ──────
    emitActivity({
      kind: "ITEM_CREATED",
      itemId: item._id.toString(),
      itemName: item.name,
      at: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, item },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";

    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;

    const skip = (page - 1) * limit;

    const query: any = {};

    // Search by item name
    if (search) {
      query.name = {
        $regex: search,
        $options: "i",
      };
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    const totalItems = await Item.countDocuments(query);

    const items = await Item.find(query)
      .populate("category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      items,
    });

  } catch (error) {
    return handleApiError(error);
  }
}