import { Schema, model } from "mongoose";

export interface ISalaryMonth {
  userId: string;
  month: number;
  year: number;
  totalSalary: number;
  totalSpent: number;
  remainingSalary: number;
}

const salaryMonthSchema = new Schema<ISalaryMonth>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
    },
    totalSalary: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalSpent: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    remainingSalary: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

salaryMonthSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export default model<ISalaryMonth>("SalaryMonth", salaryMonthSchema);
