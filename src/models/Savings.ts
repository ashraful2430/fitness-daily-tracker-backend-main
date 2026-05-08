import { Schema, model } from "mongoose";

export interface ISavings {
  userId: string;
  amount: number;
  sourceName: string;
  note: string;
  date: Date;
}

const savingsSchema = new Schema<ISavings>(
  {
    userId: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true },
    sourceName: { type: String, required: true, trim: true },
    note: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
  },
  { timestamps: true },
);

savingsSchema.index({ userId: 1, createdAt: -1 });

export default model<ISavings>("Savings", savingsSchema);
