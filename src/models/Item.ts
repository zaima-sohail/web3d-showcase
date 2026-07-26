import { Schema, model, models } from "mongoose";

const ItemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    tags: [
      {
        type: String,
      },
    ],

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    coverImage: {
      type: String,
      default: "",
    },

    images: [
      {
        type: String,
      },
    ],

    modelUrl: {
      type: String,
      default: "",
    },

    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default models.Item || model("Item", ItemSchema);