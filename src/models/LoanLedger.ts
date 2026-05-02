import { Schema, model } from "mongoose";

export const LOAN_LEDGER_TYPES = ["DISBURSEMENT", "REPAYMENT"] as const;
export type LoanLedgerType = (typeof LOAN_LEDGER_TYPES)[number];

export interface ILoanLedger {
  loanId: string;
  type: LoanLedgerType;
  amount: number;
}

const loanLedgerSchema = new Schema<ILoanLedger>(
  {
    loanId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: LOAN_LEDGER_TYPES,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

loanLedgerSchema.index({ loanId: 1, createdAt: -1 });

export default model<ILoanLedger>("LoanLedger", loanLedgerSchema);
