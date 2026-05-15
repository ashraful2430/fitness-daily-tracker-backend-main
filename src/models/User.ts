import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  gender: string;
  occupation: string;
  lastLoginDate?: Date | null;
  loginStreak: number;
  longestLoginStreak: number;
  isBlocked: boolean;
  blockedReason?: string | null;
  blockedAt?: Date | null;
  blockedBy?: mongoose.Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
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

    gender: {
      type: String,
      trim: true,
      default: "",
    },

    occupation: {
      type: String,
      trim: true,
      default: "",
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
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedReason: {
      type: String,
      default: null,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IUser>("User", UserSchema);
