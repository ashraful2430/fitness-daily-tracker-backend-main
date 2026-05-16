import mongoose, { Schema, Document } from "mongoose";

export interface ILearningAlarmSound extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  url: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const LearningAlarmSoundSchema = new Schema<ILearningAlarmSound>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

LearningAlarmSoundSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ILearningAlarmSound>(
  "LearningAlarmSound",
  LearningAlarmSoundSchema,
);
