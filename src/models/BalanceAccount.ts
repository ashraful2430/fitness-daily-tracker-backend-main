import { Schema, model, Types } from "mongoose";

export const BALANCE_ACCOUNT_TYPES = [
  "CASH",
  "BANK",
  "SALARY",
  "EXTERNAL",
] as const;
export type BalanceAccountType = (typeof BALANCE_ACCOUNT_TYPES)[number];

export interface IBalanceAccount {
  userId: string;
  type: BalanceAccountType;
  amount: number;
}

const balanceAccountSchema = new Schema<IBalanceAccount>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: BALANCE_ACCOUNT_TYPES,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

balanceAccountSchema.index({ userId: 1, type: 1, createdAt: -1 });

export default model<IBalanceAccount>("BalanceAccount", balanceAccountSchema);
