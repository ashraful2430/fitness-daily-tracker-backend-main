import { Schema, model } from "mongoose";

export interface IExternalDebt {
  userId: string;
  creditorName: string;
  totalAmount: number;
  remainingAmount: number;
  isCleared: boolean;
  createdAt: Date;
}

const externalDebtSchema = new Schema<IExternalDebt>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    creditorName: {
      type: String,
      required: true,
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    isCleared: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

externalDebtSchema.index({ userId: 1, creditorName: 1 });
externalDebtSchema.index({ userId: 1, isCleared: 1 });

export default model<IExternalDebt>("ExternalDebt", externalDebtSchema);
