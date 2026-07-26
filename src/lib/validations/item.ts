import { z } from "zod";

export const ItemSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  coverImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  modelUrl: z.string().optional(),
});

/** Partial schema for updates — all fields optional */
export const UpdateItemSchema = ItemSchema.partial();
