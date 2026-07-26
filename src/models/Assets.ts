import { Schema, model, models } from "mongoose";

const AssetSchema = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "Item",
    },

    type: String,

    url: String,

    publicId: String,

    size: Number,
  },
  {
    timestamps: true,
  }
);

export default models.Asset || model("Asset", AssetSchema);