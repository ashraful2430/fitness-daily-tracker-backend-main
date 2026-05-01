import { Schema, model } from "mongoose";

interface IBalanceRecord {
  userId: string;
  amount: number;
}

const balanceRecordSchema = new Schema<IBalanceRecord>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

balanceRecordSchema.index({ userId: 1 }, { unique: true });

export default model<IBalanceRecord>("BalanceRecord", balanceRecordSchema);
