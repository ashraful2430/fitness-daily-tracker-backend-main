import mongoose, { Schema, Document } from "mongoose";

export interface IWorkout extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  duration: number;
  type: string;
  status: "planned" | "completed";
  calories: number;
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
    duration: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      default: "General",
    },
    status: {
      type: String,
      enum: ["planned", "completed"],
      default: "planned",
    },
    calories: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

WorkoutSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IWorkout>("Workout", WorkoutSchema);
