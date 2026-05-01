// backend/src/models/DashboardData.ts
// Replace your existing file with this — same as before but with indexes added

import mongoose, { Schema, Document } from "mongoose";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface IWorkoutStreak extends Document {
  userId: mongoose.Types.ObjectId;
  currentStreak: number;
  lastWorkoutDate: Date;
  longestStreak: number;
}

interface IWaterIntake extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  glassesConsumed: number;
  goalGlasses: number;
}

interface IFocusSession extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  totalMinutes: number;
  sessions: Array<{
    startTime: Date;
    endTime: Date;
    duration: number;
    category: string;
  }>;
}

interface IWeeklyGoal extends Document {
  userId: mongoose.Types.ObjectId;
  weekStart: Date;
  totalWorkouts: number;
  completedWorkouts: number;
  goalWorkouts: number;
  progressPercentage: number;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const WorkoutStreakSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currentStreak: { type: Number, default: 0 },
    lastWorkoutDate: { type: Date },
    longestStreak: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const WaterIntakeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    glassesConsumed: { type: Number, default: 0 },
    goalGlasses: { type: Number, default: 8 },
  },
  { timestamps: true },
);

const FocusSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    totalMinutes: { type: Number, default: 0 },
    sessions: [
      {
        startTime: Date,
        endTime: Date,
        duration: Number,
        category: String,
      },
    ],
  },
  { timestamps: true },
);

const WeeklyGoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    weekStart: { type: Date, required: true },
    totalWorkouts: { type: Number, default: 0 },
    completedWorkouts: { type: Number, default: 0 },
    goalWorkouts: { type: Number, default: 5 },
    progressPercentage: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ─── Indexes (this is what makes queries fast) ────────────────────────────────

// Single field indexes for userId lookups
WorkoutStreakSchema.index({ userId: 1 });

// Compound indexes for userId + date (most common query pattern)
WaterIntakeSchema.index({ userId: 1, date: 1 }, { unique: true });
FocusSessionSchema.index({ userId: 1, date: 1 }, { unique: true });
WeeklyGoalSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

// ─── Models ───────────────────────────────────────────────────────────────────

export const WorkoutStreak = mongoose.model<IWorkoutStreak>(
  "WorkoutStreak",
  WorkoutStreakSchema,
);
export const WaterIntake = mongoose.model<IWaterIntake>(
  "WaterIntake",
  WaterIntakeSchema,
);
export const FocusSession = mongoose.model<IFocusSession>(
  "FocusSession",
  FocusSessionSchema,
);
export const WeeklyGoal = mongoose.model<IWeeklyGoal>(
  "WeeklyGoal",
  WeeklyGoalSchema,
);
