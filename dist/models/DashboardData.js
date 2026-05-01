"use strict";
// backend/src/models/DashboardData.ts
// Replace your existing file with this — same as before but with indexes added
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeeklyGoal = exports.FocusSession = exports.WaterIntake = exports.WorkoutStreak = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ─── Schemas ──────────────────────────────────────────────────────────────────
const WorkoutStreakSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    currentStreak: { type: Number, default: 0 },
    lastWorkoutDate: { type: Date },
    longestStreak: { type: Number, default: 0 },
}, { timestamps: true });
const WaterIntakeSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    glassesConsumed: { type: Number, default: 0 },
    goalGlasses: { type: Number, default: 8 },
}, { timestamps: true });
const FocusSessionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    totalMinutes: { type: Number, default: 0 },
    sessions: [
        {
            startTime: Date,
            endTime: Date,
            duration: Number,
            category: String,
        },
    ],
}, { timestamps: true });
const WeeklyGoalSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    weekStart: { type: Date, required: true },
    totalWorkouts: { type: Number, default: 0 },
    completedWorkouts: { type: Number, default: 0 },
    goalWorkouts: { type: Number, default: 5 },
    progressPercentage: { type: Number, default: 0 },
}, { timestamps: true });
// ─── Indexes (this is what makes queries fast) ────────────────────────────────
// Single field indexes for userId lookups
WorkoutStreakSchema.index({ userId: 1 });
// Compound indexes for userId + date (most common query pattern)
WaterIntakeSchema.index({ userId: 1, date: 1 }, { unique: true });
FocusSessionSchema.index({ userId: 1, date: 1 }, { unique: true });
WeeklyGoalSchema.index({ userId: 1, weekStart: 1 }, { unique: true });
// ─── Models ───────────────────────────────────────────────────────────────────
exports.WorkoutStreak = mongoose_1.default.model("WorkoutStreak", WorkoutStreakSchema);
exports.WaterIntake = mongoose_1.default.model("WaterIntake", WaterIntakeSchema);
exports.FocusSession = mongoose_1.default.model("FocusSession", FocusSessionSchema);
exports.WeeklyGoal = mongoose_1.default.model("WeeklyGoal", WeeklyGoalSchema);
