import { Schema, model } from "mongoose";

export interface ILearningGoal {
  userId: string;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
}

const learningGoalSchema = new Schema<ILearningGoal>(
  {
    userId: { type: String, required: true, trim: true, unique: true, index: true },
    dailyGoalMinutes: { type: Number, default: 60, min: 1, max: 1440 },
    weeklyGoalMinutes: { type: Number, default: 420, min: 1, max: 10080 },
  },
  { timestamps: true },
);

export default model<ILearningGoal>("LearningGoal", learningGoalSchema);
