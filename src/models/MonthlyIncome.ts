import { Schema, model } from "mongoose";

export interface IMonthlyIncome {
  userId: string;
  year: number;
  month: number;
  totalIncome: number;
  salaryIncome: number;
  externalIncome: number;
}

const monthlyIncomeSchema = new Schema<IMonthlyIncome>(
  {
    userId: { type: String, required: true, trim: true, index: true },
    year: { type: Number, required: true, min: 1900, max: 9999, index: true },
    month: { type: Number, required: true, min: 1, max: 12, index: true },
    totalIncome: { type: Number, default: 0, min: 0 },
    salaryIncome: { type: Number, default: 0, min: 0 },
    externalIncome: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

monthlyIncomeSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export default model<IMonthlyIncome>("MonthlyIncome", monthlyIncomeSchema);
