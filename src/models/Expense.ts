import { Schema, model } from "mongoose";

interface IExpense {
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });

export default model<IExpense>("Expense", expenseSchema);
