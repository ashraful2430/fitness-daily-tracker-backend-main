import { Schema, model } from "mongoose";

export const LOAN_DEBT_STATUSES = ["ACTIVE", "PAID"] as const;
export type LoanDebtStatus = (typeof LOAN_DEBT_STATUSES)[number];

export interface ILoanDebt {
  userId: string;
  personName: string;
  amount: number;
  reason: string;
  date: Date;
  status: LoanDebtStatus;
  linkedLendingId?: string;
}

const loanDebtSchema = new Schema<ILoanDebt>(
  {
    userId: { type: String, required: true, index: true },
    personName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: LOAN_DEBT_STATUSES,
      default: "ACTIVE",
    },
    linkedLendingId: { type: String },
  },
  { timestamps: true },
);

loanDebtSchema.index({ userId: 1, status: 1 });

export default model<ILoanDebt>("LoanDebt", loanDebtSchema);
