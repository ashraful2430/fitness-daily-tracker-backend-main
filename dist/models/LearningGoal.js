"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const learningGoalSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, trim: true, unique: true, index: true },
    dailyGoalMinutes: { type: Number, default: 60, min: 1, max: 1440 },
    weeklyGoalMinutes: { type: Number, default: 420, min: 1, max: 10080 },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("LearningGoal", learningGoalSchema);
