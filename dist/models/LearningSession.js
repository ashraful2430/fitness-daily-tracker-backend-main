"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_SESSION_STATUSES = void 0;
const mongoose_1 = require("mongoose");
exports.LEARNING_SESSION_STATUSES = [
    "planned",
    "active",
    "paused",
    "completed",
];
const learningSessionSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    plannedMinutes: {
        type: Number,
        required: true,
        min: 1,
    },
    actualMinutes: {
        type: Number,
        default: 0,
        min: 0,
    },
    status: {
        type: String,
        enum: exports.LEARNING_SESSION_STATUSES,
        default: "planned",
    },
    notes: {
        type: String,
        trim: true,
    },
    date: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
        trim: true,
    },
    startedAt: {
        type: Date,
        default: null,
    },
    completedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});
learningSessionSchema.index({ userId: 1, date: -1, createdAt: -1 });
learningSessionSchema.index({ userId: 1, status: 1 });
learningSessionSchema.index({ userId: 1, subject: 1 });
learningSessionSchema.index({ userId: 1, updatedAt: -1 });
exports.default = (0, mongoose_1.model)("LearningSession", learningSessionSchema);
