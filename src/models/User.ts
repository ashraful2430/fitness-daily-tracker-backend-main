import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  lastLoginDate?: Date | null;
  loginStreak: number;
  longestLoginStreak: number;
  personalBalance: number;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    lastLoginDate: {
      type: Date,
      default: null,
    },

    loginStreak: {
      type: Number,
      default: 0,
    },

    longestLoginStreak: {
      type: Number,
      default: 0,
    },
    personalBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IUser>("User", UserSchema);
