import { Schema, model } from "mongoose";

interface ICategory {
  userId: string;
  name: string;
}

const categorySchema = new Schema<ICategory>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

export default model<ICategory>("Category", categorySchema);
