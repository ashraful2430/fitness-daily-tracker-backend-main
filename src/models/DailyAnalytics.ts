import mongoose, { Schema, Document } from "mongoose";

export interface IDailyAnalytics extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  loginCompleted: boolean;
  score: number;
  focusMinutes: number;
  workouts: number;
  completedSections: number;
  totalSections: number;
  perfectDay: boolean;
}

const DailyAnalyticsSchema = new Schema<IDailyAnalytics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    loginCompleted: {
      type: Boolean,
      default: false,
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    focusMinutes: {
      type: Number,
      default: 0,
    },

    workouts: {
      type: Number,
      default: 0,
    },

    completedSections: {
      type: Number,
      default: 0,
    },

    totalSections: {
      type: Number,
      default: 0,
    },

    perfectDay: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// One record per user per day
DailyAnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IDailyAnalytics>(
  "DailyAnalytics",
  DailyAnalyticsSchema,
);
