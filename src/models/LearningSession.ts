import { Schema, model } from "mongoose";

export const LEARNER_MODES = [
  "student",
  "job_holder",
  "child",
  "self_learner",
] as const;
export const LEARNING_SESSION_STATUSES = [
  "planned",
  "active",
  "paused",
  "completed",
  "missed",
  "cancelled",
] as const;
export const LEARNING_TYPES = [
  "reading",
  "video",
  "practice",
  "revision",
  "assignment",
  "exam_prep",
  "course",
  "other",
] as const;
export const LEARNING_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const LEARNING_PRIORITIES = ["low", "medium", "high"] as const;

export type LearningSessionStatus = (typeof LEARNING_SESSION_STATUSES)[number];
export type LearnerMode = (typeof LEARNER_MODES)[number];
export type LearningType = (typeof LEARNING_TYPES)[number];
export type LearningDifficulty = (typeof LEARNING_DIFFICULTIES)[number];
export type LearningPriority = (typeof LEARNING_PRIORITIES)[number];

export interface ILearningSession {
  userId: string;
  learnerMode: LearnerMode;
  title: string;
  subject: string;
  goal: string;
  plannedMinutes: number;
  actualMinutes: number;
  studyDate: string;
  learningType: LearningType;
  difficulty: LearningDifficulty;
  priority: LearningPriority;
  tags: string[];
  notes?: string;
  status: LearningSessionStatus;
  startedAt: Date | null;
  pausedAt: Date | null;
  completedAt: Date | null;
  alarmEnabled: boolean;
  alarmSound: string;
  breakEnabled: boolean;
  breakMinutes: number;
}

const learningSessionSchema = new Schema<ILearningSession>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    learnerMode: {
      type: String,
      enum: LEARNER_MODES,
      default: "self_learner",
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
    goal: {
      type: String,
      default: "",
      trim: true,
    },
    plannedMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 600,
    },
    actualMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    studyDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      trim: true,
    },
    learningType: {
      type: String,
      enum: LEARNING_TYPES,
      default: "other",
    },
    difficulty: {
      type: String,
      enum: LEARNING_DIFFICULTIES,
      default: "medium",
    },
    priority: {
      type: String,
      enum: LEARNING_PRIORITIES,
      default: "medium",
    },
    tags: {
      type: [String],
      default: [],
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
    startedAt: {
      type: Date,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    alarmEnabled: {
      type: Boolean,
      default: false,
    },
    alarmSound: {
      type: String,
      default: "default",
      trim: true,
    },
    breakEnabled: {
      type: Boolean,
      default: false,
    },
    breakMinutes: {
      type: Number,
      default: 5,
      min: 1,
      max: 120,
    },
  },
  {
    timestamps: true,
  },
);

learningSessionSchema.index({ userId: 1, studyDate: -1, createdAt: -1 });
learningSessionSchema.index({ userId: 1, status: 1 });
learningSessionSchema.index({ userId: 1, status: 1, updatedAt: -1 });
learningSessionSchema.index({ userId: 1, subject: 1 });
learningSessionSchema.index({ userId: 1, learnerMode: 1 });
learningSessionSchema.index({ userId: 1, updatedAt: -1, studyDate: -1 });

export default model<ILearningSession>("LearningSession", learningSessionSchema);
