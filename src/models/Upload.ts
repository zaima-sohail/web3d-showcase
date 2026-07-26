import { Schema, model, models } from "mongoose";

const UploadSchema = new Schema(
  {
    filename: String,

    progress: Number,

    status: String,

    error: String,
  },
  {
    timestamps: true,
  }
);

export default models.Upload || model("Upload", UploadSchema);