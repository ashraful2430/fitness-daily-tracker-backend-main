import { Schema, model, Types } from "mongoose";

export const BALANCE_ACCOUNT_TYPES = [
  "CASH",
  "BANK",
  "SALARY",
  "EXTERNAL",
] as const;
export type BalanceAccountType = (typeof BALANCE_ACCOUNT_TYPES)[number];

export const BALANCE_ACCOUNT_SOURCES = [
  "USER_ADDED",
  "BALANCE_ADJUSTMENT",
  "EXPENSE_REFUND",
  "INCOME_ADDED",
  "SAVINGS_ADDED",
  "SALARY_ADDED",
  "LOAN_REPAID",
] as const;
export type BalanceAccountSource = (typeof BALANCE_ACCOUNT_SOURCES)[number];

export interface IBalanceAccount {
  userId: string;
  type: BalanceAccountType;
  amount: number;
  source: BalanceAccountSource;
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
    source: {
      type: String,
      required: true,
      enum: BALANCE_ACCOUNT_SOURCES,
      default: "USER_ADDED",
      index: true,
    },
  },
  { timestamps: true },
);

balanceAccountSchema.index({ userId: 1, type: 1, createdAt: -1 });

export default model<IBalanceAccount>("BalanceAccount", balanceAccountSchema);
