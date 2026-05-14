import { Schema, model } from "mongoose";

export interface IChildLearningControl {
  userId: string;
  parentPinHash: string;
  dailyLimitMinutes: number;
  rewardPointsEnabled: boolean;
  allowedSubjects: string[];
}

const childLearningControlSchema = new Schema<IChildLearningControl>(
  {
    userId: { type: String, required: true, trim: true, unique: true, index: true },
    parentPinHash: { type: String, required: true },
    dailyLimitMinutes: { type: Number, default: 60, min: 1, max: 600 },
    rewardPointsEnabled: { type: Boolean, default: true },
    allowedSubjects: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default model<IChildLearningControl>(
  "ChildLearningControl",
  childLearningControlSchema,
);
