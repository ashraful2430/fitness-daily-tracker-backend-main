import mongoose, { Schema, Document } from "mongoose";
import { PERSONAL_RECORD_TYPES } from "../constants/fitness";

export interface IPersonalRecord extends Document {
  userId: mongoose.Types.ObjectId;
  recordType: string;
  value: number;
  unit: string;
  workoutId?: mongoose.Types.ObjectId | null;
  achievedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const PersonalRecordSchema = new Schema<IPersonalRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recordType: { type: String, enum: PERSONAL_RECORD_TYPES, required: true },
    value: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    workoutId: { type: Schema.Types.ObjectId, ref: "Workout", default: null },
    achievedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

PersonalRecordSchema.index({ userId: 1, recordType: 1 }, { unique: true });
PersonalRecordSchema.index({ userId: 1, achievedAt: -1 });

export default mongoose.model<IPersonalRecord>(
  "PersonalRecord",
  PersonalRecordSchema,
);
