import { Schema, model } from "mongoose";

export interface IExternalDebt {
  userId: string;
  creditor: string;
  totalAmount: number;
  remainingAmount: number;
}

const externalDebtSchema = new Schema<IExternalDebt>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    creditor: {
      type: String,
      required: true,
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

externalDebtSchema.index({ userId: 1, creditor: 1 }, { unique: true });
externalDebtSchema.index({ userId: 1, updatedAt: -1 });

export default model<IExternalDebt>("ExternalDebt", externalDebtSchema);
