import { Schema, model } from "mongoose";

export const LOAN_SOURCE_TYPES = ["PERSONAL", "BORROWED"] as const;
export const LOAN_STATUS_TYPES = ["ACTIVE", "PARTIAL", "CLOSED"] as const;
export type LoanSourceType = (typeof LOAN_SOURCE_TYPES)[number];
export type LoanStatusType = (typeof LOAN_STATUS_TYPES)[number];

export interface ILoan {
  userId: string;
  borrower: string;
  amount: number;
  remainingAmount: number;
  sourceType: LoanSourceType;
  status: LoanStatusType;
}

const loanSchema = new Schema<ILoan>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    borrower: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    sourceType: {
      type: String,
      required: true,
      enum: LOAN_SOURCE_TYPES,
    },
    status: {
      type: String,
      required: true,
      enum: LOAN_STATUS_TYPES,
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  },
);

loanSchema.index({ userId: 1, status: 1 });

export default model<ILoan>("Loan", loanSchema);
