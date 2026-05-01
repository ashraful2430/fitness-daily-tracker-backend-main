import { Schema, model } from "mongoose";

interface ISalary {
  userId: string;
  amount: number;
}

const salarySchema = new Schema<ISalary>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

salarySchema.index({ userId: 1 }, { unique: true });

export default model<ISalary>("Salary", salarySchema);
