"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Define the structure for WeeklyStats
const weeklyStatsSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    weekStart: { type: Date, required: true },
    workouts: { type: Number, default: 0 }, // Total number of workouts for the week
    focusMinutes: { type: Number, default: 0 }, // Total minutes of focus sessions
    dailyStats: [
        {
            date: { type: Date, required: true },
            workouts: { type: Number, default: 0 },
            focusMinutes: { type: Number, default: 0 },
        },
    ],
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
});
weeklyStatsSchema.index({ userId: 1, weekStart: 1 }, { unique: true });
// Create and export the WeeklyStats model
const WeeklyStats = (0, mongoose_1.model)("WeeklyStats", weeklyStatsSchema);
exports.default = WeeklyStats;
