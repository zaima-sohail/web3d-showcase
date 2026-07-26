import { NextResponse } from "next/server";
import { connectDB } from "@/src/lib/mongodb";
import Item from "@/src/models/Item";
import Category from "@/src/models/Category";
import User from "@/src/models/User";
import Activity from "@/src/models/Activity";
import Asset from "@/src/models/Assets";
import { handleApiError } from "@/src/lib/apiError";

export async function GET() {
  try {
    await connectDB();

    // ── Aggregation Pipeline ────────────────────────────────────────────
    const [
      // 1. Category-wise item distribution (with counts)
      categoryDistribution,

      // 2. Monthly item creation trend (last 12 months)
      monthlyTrends,

      // 3. Top 10 most-viewed items
      topViewedItems,

      // 4. Asset storage summary (total count & size by type)
      assetSummary,

      // 5. Recent activity log (last 50 entries)
      recentActivity,
    ] = await Promise.all([
      // Pipeline 1: Items grouped by category
      Item.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            categoryId: "$_id",
            categoryName: { $ifNull: ["$category.name", "Uncategorized"] },
            count: 1,
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Pipeline 2: Monthly item creation trend (last 12 months)
      Item.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            total: { $sum: 1 },
            published: {
              $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
            },
            draft: {
              $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
            },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
          $project: {
            _id: 0,
            year: "$_id.year",
            month: "$_id.month",
            total: 1,
            published: 1,
            draft: 1,
          },
        },
      ]),

      // Pipeline 3: Top 10 most-viewed items
      Item.aggregate([
        { $sort: { views: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            views: 1,
            status: 1,
            categoryName: { $ifNull: ["$category.name", "Uncategorized"] },
            createdAt: 1,
          },
        },
      ]),

      // Pipeline 4: Asset storage summary
      Asset.aggregate([
        {
          $group: {
            _id: "$type",
            totalAssets: { $sum: 1 },
            totalSize: { $sum: { $ifNull: ["$size", 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            type: "$_id",
            totalAssets: 1,
            totalSize: 1,
          },
        },
      ]),

      // Pipeline 5: Recent activity (last 50 entries)
      Activity.aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
        {
          $project: {
            _id: 1,
            user: 1,
            action: 1,
            item: 1,
            timestamp: "$createdAt",
          },
        },
      ]),
    ]);

    // ── Simple Counts (still parallel-friendly) ─────────────────────────
    const [
      totalItems,
      totalCategories,
      publishedItems,
      draftItems,
      totalUsers,
      totalViews,
    ] = await Promise.all([
      Item.countDocuments(),
      Category.countDocuments(),
      Item.countDocuments({ status: "published" }),
      Item.countDocuments({ status: "draft" }),
      User.countDocuments(),
      // Sum all views across all items
      Item.aggregate([
        { $group: { _id: null, total: { $sum: "$views" } } },
      ]).then((res) => (res[0]?.total ?? 0)),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalItems,
          totalCategories,
          publishedItems,
          draftItems,
          totalUsers,
          totalViews,
        },
        charts: {
          categoryDistribution,
          monthlyTrends,
        },
        insights: {
          topViewedItems,
          assetSummary,
        },
        activity: recentActivity,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}


