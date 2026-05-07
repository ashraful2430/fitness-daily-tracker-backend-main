import { Schema, model } from "mongoose";

export const FUNDING_SOURCES = ["PERSONAL", "BORROWED"] as const;
export type FundingSource = (typeof FUNDING_SOURCES)[number];

export const LENDING_STATUSES = ["ACTIVE", "REPAID"] as const;
export type LendingStatus = (typeof LENDING_STATUSES)[number];

export interface ILending {
  userId: string;
  personName: string;
  amount: number;
  fundingSource: FundingSource;
  date: Date;
  status: LendingStatus;
  linkedLoanId?: string;
}

const lendingSchema = new Schema<ILending>(
  {
    userId: { type: String, required: true, index: true },
    personName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    fundingSource: {
      type: String,
      required: true,
      enum: FUNDING_SOURCES,
    },
    date: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: LENDING_STATUSES,
      default: "ACTIVE",
    },
    linkedLoanId: { type: String },
  },
  { timestamps: true },
);

lendingSchema.index({ userId: 1, status: 1 });

export default model<ILending>("Lending", lendingSchema);
