import { Schema, model } from "mongoose";

interface IExpense {
  userId: string;
  amount: number;
  description?: string;
  category: string;
  date: Date;
  note?: string;
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
      default: "",
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

expenseSchema
  .virtual("note")
  .get(function (this: IExpense) {
    return this.description;
  })
  .set(function (this: IExpense, value?: string | null) {
    this.description = typeof value === "string" ? value : "";
  });

expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });

export default model<IExpense>("Expense", expenseSchema);
