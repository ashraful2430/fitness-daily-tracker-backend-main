import mongoose, { Schema, Document } from "mongoose";
import {
  FEEDBACK_EFFECT_CATEGORIES,
  FEEDBACK_EFFECT_KEYS,
} from "../constants/feedbackEffects";

export interface IFeedbackEffect extends Document {
  key: string;
  label: string;
  category: string;
  description?: string | null;
  soundUrl?: string | null;
  memeImageUrl?: string | null;
  enabled: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const FeedbackEffectSchema = new Schema<IFeedbackEffect>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: FEEDBACK_EFFECT_KEYS,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: FEEDBACK_EFFECT_CATEGORIES,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    soundUrl: {
      type: String,
      trim: true,
      default: null,
    },
    memeImageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

FeedbackEffectSchema.index({ enabled: 1, category: 1, key: 1 });

export default mongoose.model<IFeedbackEffect>(
  "FeedbackEffect",
  FeedbackEffectSchema,
);
