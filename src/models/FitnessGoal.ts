import mongoose, { Schema, Document } from "mongoose";

export interface IFitnessGoal extends Document {
  userId: mongoose.Types.ObjectId;
  weeklyWorkoutTarget: number;
  weeklyActiveMinutesTarget: number;
  weeklyCaloriesTarget: number;
  dailyStepsTarget: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const FitnessGoalSchema = new Schema<IFitnessGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    weeklyWorkoutTarget: { type: Number, min: 1, max: 30, default: 4 },
    weeklyActiveMinutesTarget: { type: Number, min: 1, max: 5000, default: 150 },
    weeklyCaloriesTarget: { type: Number, min: 0, max: 50000, default: 1500 },
    dailyStepsTarget: { type: Number, min: 0, max: 100000, default: 8000 },
  },
  { timestamps: true },
);

FitnessGoalSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model<IFitnessGoal>("FitnessGoal", FitnessGoalSchema);
