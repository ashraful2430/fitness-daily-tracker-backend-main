import { Schema, model } from "mongoose";

interface IMoneyState {
  userId: string;
  lastExpenseResetMonth: string;
}

const moneyStateSchema = new Schema<IMoneyState>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    lastExpenseResetMonth: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export default model<IMoneyState>("MoneyState", moneyStateSchema);
