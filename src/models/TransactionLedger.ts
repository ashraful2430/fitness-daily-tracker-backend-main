import { Schema, model } from "mongoose";

export const TRANSACTION_TYPES = ["CREDIT", "DEBIT"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_SOURCES = [
  "EXPENSE",
  "LOAN_GIVEN",
  "LOAN_REPAID",
  "SALARY_ADDED",
  "BALANCE_ADDED",
] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export interface ITransactionLedger {
  userId: string;
  type: TransactionType;
  source: TransactionSource;
  amount: number;
  referenceId: string;
}

const transactionLedgerSchema = new Schema<ITransactionLedger>(
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
      enum: TRANSACTION_TYPES,
    },
    source: {
      type: String,
      required: true,
      enum: TRANSACTION_SOURCES,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

transactionLedgerSchema.index({ userId: 1, createdAt: -1 });

export default model<ITransactionLedger>(
  "TransactionLedger",
  transactionLedgerSchema,
);
