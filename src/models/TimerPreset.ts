import { Schema, model } from "mongoose";

export interface ITimerPreset {
  userId: string | null;
  label: string;
  minutes: number;
  isDefault: boolean;
}

const timerPresetSchema = new Schema<ITimerPreset>(
  {
    userId: { type: String, default: null, index: true },
    label: { type: String, required: true, trim: true },
    minutes: { type: Number, required: true, min: 1, max: 600 },
    isDefault: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

timerPresetSchema.index({ userId: 1, label: 1 }, { unique: true, sparse: true });

export default model<ITimerPreset>("TimerPreset", timerPresetSchema);
