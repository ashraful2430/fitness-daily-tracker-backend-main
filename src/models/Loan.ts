import { Schema, model } from "mongoose";

interface ILoan {
  userId: string;
  lender: string;
  reason: string;
  amount: number;
  paidAmount: number;
  status: "open" | "paid";
  paidAt?: Date;
  date: Date;
}

const loanSchema = new Schema<ILoan>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    lender: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["open", "paid"],
      default: "open",
    },
    paidAt: {
      type: Date,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

loanSchema.index({ userId: 1 });

export default model<ILoan>("Loan", loanSchema);
