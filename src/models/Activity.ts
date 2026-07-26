import { Schema, model, models } from "mongoose";

const ActivitySchema = new Schema(
  {
    user: String,

    action: String,

    item: String,
  },
  {
    timestamps: true,
  }
);

export default models.Activity || model("Activity", ActivitySchema);