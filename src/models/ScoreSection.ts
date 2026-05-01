import mongoose, { Schema, Document } from "mongoose";

export interface IScoreSection extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  emoji: string;
  goalType: "count" | "duration" | "boolean";
  goalValue: number;
  currentValue: number;
  date: Date;
  order: number;
}

const ScoreSectionSchema = new Schema<IScoreSection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    emoji: { type: String, default: "⭐" },
    goalType: {
      type: String,
      enum: ["count", "duration", "boolean"],
      default: "count",
    },
    goalValue: { type: Number, required: true, min: 1 },
    currentValue: { type: Number, default: 0 },
    date: { type: Date, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ScoreSectionSchema.index({ userId: 1, date: 1 });

export const ScoreSection = mongoose.model<IScoreSection>(
  "ScoreSection",
  ScoreSectionSchema,
);
