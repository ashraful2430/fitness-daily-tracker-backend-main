import { Schema, model } from "mongoose";

// Define the structure for WeeklyStats
const weeklyStatsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    weekStart: { type: Date, required: true },
    workouts: { type: Number, default: 0 }, // Total number of workouts for the week
    focusMinutes: { type: Number, default: 0 }, // Total minutes of focus sessions
    dailyStats: [
      {
        date: { type: Date, required: true },
        workouts: { type: Number, default: 0 },
        focusMinutes: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  },
);

weeklyStatsSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

// Create and export the WeeklyStats model
const WeeklyStats = model("WeeklyStats", weeklyStatsSchema);
export default WeeklyStats;
