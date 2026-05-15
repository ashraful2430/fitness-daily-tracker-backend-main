import mongoose, { Schema, Document } from "mongoose";
import {
  BODY_PARTS,
  FITNESS_GOAL_TYPES,
  WORKOUT_INTENSITIES,
  WORKOUT_TYPES,
} from "../constants/fitness";

export interface IWorkoutTemplate extends Document {
  userId?: mongoose.Types.ObjectId | null;
  name: string;
  goalType: string;
  title: string;
  workoutType: string;
  durationMinutes: number;
  caloriesEstimate: number;
  intensity: string;
  bodyPart: string;
  notesPlaceholder?: string | null;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const WorkoutTemplateSchema = new Schema<IWorkoutTemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    goalType: {
      type: String,
      required: true,
      enum: FITNESS_GOAL_TYPES,
      default: "general_fitness",
    },
    title: { type: String, required: true, trim: true },
    workoutType: {
      type: String,
      required: true,
      enum: WORKOUT_TYPES,
      default: "general",
    },
    durationMinutes: { type: Number, required: true, min: 1, max: 600 },
    caloriesEstimate: { type: Number, default: 0, min: 0 },
    intensity: {
      type: String,
      required: true,
      enum: WORKOUT_INTENSITIES,
      default: "medium",
    },
    bodyPart: {
      type: String,
      required: true,
      enum: BODY_PARTS,
      default: "full_body",
    },
    notesPlaceholder: { type: String, trim: true, default: "" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

WorkoutTemplateSchema.index(
  { name: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);
WorkoutTemplateSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IWorkoutTemplate>(
  "WorkoutTemplate",
  WorkoutTemplateSchema,
);
