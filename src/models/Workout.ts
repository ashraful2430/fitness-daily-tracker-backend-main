import mongoose, { Schema, Document } from "mongoose";
import {
  BODY_PARTS,
  FITNESS_GOAL_TYPES,
  WORKOUT_INTENSITIES,
  WORKOUT_MOODS,
  WORKOUT_STATUSES,
  WORKOUT_TYPES,
} from "../constants/fitness";

export interface IWorkout extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  workoutDate: Date;
  workoutType: string;
  goalType: string;
  durationMinutes: number;
  calories: number;
  intensity: string;
  bodyPart: string;
  sets: number;
  reps: number;
  weight: number;
  distance: number;
  steps: number;
  moodAfter?: string | null;
  notes: string;
  status: "planned" | "active" | "completed" | "skipped" | "cancelled";
  startedAt?: Date | null;
  completedAt?: Date | null;
  duration?: number;
  type?: string;
}

const WorkoutSchema = new Schema<IWorkout>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    workoutDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    workoutType: {
      type: String,
      enum: WORKOUT_TYPES,
      default: "general",
    },
    goalType: {
      type: String,
      enum: FITNESS_GOAL_TYPES,
      default: "general_fitness",
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 600,
    },
    calories: {
      type: Number,
      default: 0,
      min: 0,
    },
    intensity: {
      type: String,
      enum: WORKOUT_INTENSITIES,
      default: "medium",
    },
    bodyPart: {
      type: String,
      enum: BODY_PARTS,
      default: "full_body",
    },
    sets: { type: Number, default: 0, min: 0 },
    reps: { type: Number, default: 0, min: 0 },
    weight: { type: Number, default: 0, min: 0 },
    distance: { type: Number, default: 0, min: 0 },
    steps: { type: Number, default: 0, min: 0 },
    moodAfter: {
      type: String,
      enum: WORKOUT_MOODS,
      default: null,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: WORKOUT_STATUSES,
      default: "planned",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      min: 1,
      max: 600,
    },
    type: {
      type: String,
    },
  },
  { timestamps: true },
);

WorkoutSchema.index({ userId: 1, createdAt: -1 });
WorkoutSchema.index({ userId: 1, status: 1, workoutDate: -1 });
WorkoutSchema.index({ userId: 1, workoutDate: -1 });
WorkoutSchema.index({ userId: 1, workoutType: 1 });
WorkoutSchema.index({ userId: 1, goalType: 1 });
WorkoutSchema.index({ userId: 1, bodyPart: 1 });

(WorkoutSchema as any).pre("validate", function syncLegacyWorkoutFields(this: any, next: () => void) {
  this.duration = this.durationMinutes;
  this.type = this.workoutType;
  next();
});

export default mongoose.model<IWorkout>("Workout", WorkoutSchema);
