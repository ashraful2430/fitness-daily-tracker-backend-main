import { Schema, model } from "mongoose";

export interface IIncome {
  userId: string;
  amount: number;
  source: string;
  note?: string;
  date: Date;
}

const incomeSchema = new Schema<IIncome>(
  {
    userId: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true },
    source: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
    date: { type: Date, required: true },
  },
  { timestamps: true },
);

incomeSchema.index({ userId: 1, createdAt: -1 });

export default model<IIncome>("Income", incomeSchema);
