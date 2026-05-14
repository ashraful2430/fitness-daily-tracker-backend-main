import { Schema, model } from "mongoose";

export interface ILearningNote {
  userId: string;
  sessionId: string;
  summary: string;
  difficultPoints: string;
  nextAction: string;
  important: boolean;
}

const learningNoteSchema = new Schema<ILearningNote>(
  {
    userId: { type: String, required: true, trim: true, index: true },
    sessionId: { type: String, required: true, trim: true, index: true },
    summary: { type: String, default: "", trim: true },
    difficultPoints: { type: String, default: "", trim: true },
    nextAction: { type: String, default: "", trim: true },
    important: { type: Boolean, default: false },
  },
  { timestamps: true },
);

learningNoteSchema.index({ userId: 1, sessionId: 1, createdAt: -1 });

export default model<ILearningNote>("LearningNote", learningNoteSchema);
