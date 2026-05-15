import mongoose, { Schema, Document } from "mongoose";
import {
  ENERGY_LEVELS,
  SLEEP_QUALITIES,
  SORENESS_LEVELS,
} from "../constants/fitness";

export interface IRecoveryCheck extends Document {
  userId: mongoose.Types.ObjectId;
  checkDate: Date;
  sleepQuality: string;
  energyLevel: string;
  sorenessLevel: string;
  isRestDay: boolean;
  waterGlasses: number;
  recommendation: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RecoveryCheckSchema = new Schema<IRecoveryCheck>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    checkDate: { type: Date, required: true },
    sleepQuality: { type: String, enum: SLEEP_QUALITIES, required: true },
    energyLevel: { type: String, enum: ENERGY_LEVELS, required: true },
    sorenessLevel: { type: String, enum: SORENESS_LEVELS, required: true },
    isRestDay: { type: Boolean, default: false },
    waterGlasses: { type: Number, min: 0, max: 30, default: 0 },
    recommendation: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

RecoveryCheckSchema.index({ userId: 1, checkDate: -1 });
RecoveryCheckSchema.index({ userId: 1, checkDate: 1 }, { unique: true });

export default mongoose.model<IRecoveryCheck>(
  "RecoveryCheck",
  RecoveryCheckSchema,
);
