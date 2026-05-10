import { Schema, model } from "mongoose";

export const LEARNING_SESSION_STATUSES = [
  "planned",
  "active",
  "paused",
  "completed",
] as const;

export type LearningSessionStatus = (typeof LEARNING_SESSION_STATUSES)[number];

export interface ILearningSession {
  userId: string;
  title: string;
  subject: string;
  plannedMinutes: number;
  actualMinutes: number;
  status: LearningSessionStatus;
  notes?: string;
  date: string;
  startedAt: Date | null;
  completedAt: Date | null;
}

const learningSessionSchema = new Schema<ILearningSession>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    plannedMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    actualMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: LEARNING_SESSION_STATUSES,
      default: "planned",
    },
    notes: {
      type: String,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      trim: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

learningSessionSchema.index({ userId: 1, date: -1, createdAt: -1 });
learningSessionSchema.index({ userId: 1, status: 1 });
learningSessionSchema.index({ userId: 1, status: 1, updatedAt: -1 });
learningSessionSchema.index({ userId: 1, subject: 1 });
learningSessionSchema.index({ userId: 1, updatedAt: -1 });
learningSessionSchema.index({ userId: 1, updatedAt: -1, date: -1 });

export default model<ILearningSession>("LearningSession", learningSessionSchema);
