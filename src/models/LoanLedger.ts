import { Schema, model } from "mongoose";

export type LedgerType = "DISBURSEMENT" | "REPAYMENT";

export interface ILoanLedger {
  loanId: string;
  type: LedgerType;
  amount: number;
  createdAt: Date;
}

const loanLedgerSchema = new Schema<ILoanLedger>(
  {
    loanId: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["DISBURSEMENT", "REPAYMENT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  {
    timestamps: true,
  },
);

loanLedgerSchema.index({ loanId: 1, createdAt: -1 });

export default model<ILoanLedger>("LoanLedger", loanLedgerSchema);
