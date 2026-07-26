import { Schema, model, models } from "mongoose";

const Model3DSchema = new Schema(
  {
    item: {
      type: Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: "",
    },
    format: {
      type: String,
      default: "glb",
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default models.Model3D || model("Model3D", Model3DSchema);

