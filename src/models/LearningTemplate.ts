import { Schema, model } from "mongoose";
import {
  LEARNER_MODES,
  LEARNING_DIFFICULTIES,
  LEARNING_PRIORITIES,
  LEARNING_TYPES,
  LearnerMode,
  LearningDifficulty,
  LearningPriority,
  LearningType,
} from "./LearningSession";

export interface ILearningTemplate {
  userId: string | null;
  name: string;
  learnerMode: LearnerMode;
  title: string;
  subject: string;
  goal: string;
  plannedMinutes: number;
  learningType: LearningType;
  difficulty: LearningDifficulty;
  priority: LearningPriority;
  notesPlaceholder: string;
  isDefault: boolean;
}

const learningTemplateSchema = new Schema<ILearningTemplate>(
  {
    userId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    learnerMode: { type: String, enum: LEARNER_MODES, default: "self_learner" },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    goal: { type: String, default: "", trim: true },
    plannedMinutes: { type: Number, default: 25, min: 1, max: 600 },
    learningType: { type: String, enum: LEARNING_TYPES, default: "other" },
    difficulty: { type: String, enum: LEARNING_DIFFICULTIES, default: "medium" },
    priority: { type: String, enum: LEARNING_PRIORITIES, default: "medium" },
    notesPlaceholder: { type: String, default: "", trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

learningTemplateSchema.index({ userId: 1, name: 1 }, { unique: true, sparse: true });

export default model<ILearningTemplate>("LearningTemplate", learningTemplateSchema);
