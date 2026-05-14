"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_PRIORITIES = exports.LEARNING_DIFFICULTIES = exports.LEARNING_TYPES = exports.LEARNING_SESSION_STATUSES = exports.LEARNER_MODES = void 0;
const mongoose_1 = require("mongoose");
exports.LEARNER_MODES = [
    "student",
    "job_holder",
    "child",
    "self_learner",
];
exports.LEARNING_SESSION_STATUSES = [
    "planned",
    "active",
    "paused",
    "completed",
    "missed",
    "cancelled",
];
exports.LEARNING_TYPES = [
    "reading",
    "video",
    "practice",
    "revision",
    "assignment",
    "exam_prep",
    "course",
    "other",
];
exports.LEARNING_DIFFICULTIES = ["easy", "medium", "hard"];
exports.LEARNING_PRIORITIES = ["low", "medium", "high"];
const learningSessionSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
    },
    learnerMode: {
        type: String,
        enum: exports.LEARNER_MODES,
        default: "self_learner",
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
    goal: {
        type: String,
        default: "",
        trim: true,
    },
    plannedMinutes: {
        type: Number,
        required: true,
        min: 1,
        max: 600,
    },
    actualMinutes: {
        type: Number,
        default: 0,
        min: 0,
    },
    studyDate: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
        trim: true,
    },
    learningType: {
        type: String,
        enum: exports.LEARNING_TYPES,
        default: "other",
    },
    difficulty: {
        type: String,
        enum: exports.LEARNING_DIFFICULTIES,
        default: "medium",
    },
    priority: {
        type: String,
        enum: exports.LEARNING_PRIORITIES,
        default: "medium",
    },
    tags: {
        type: [String],
        default: [],
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
    startedAt: {
        type: Date,
        default: null,
    },
    pausedAt: {
        type: Date,
        default: null,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    alarmEnabled: {
        type: Boolean,
        default: false,
    },
    alarmSound: {
        type: String,
        default: "default",
        trim: true,
    },
    breakEnabled: {
        type: Boolean,
        default: false,
    },
    breakMinutes: {
        type: Number,
        default: 5,
        min: 1,
        max: 120,
    },
}, {
    timestamps: true,
});
learningSessionSchema.index({ userId: 1, studyDate: -1, createdAt: -1 });
learningSessionSchema.index({ userId: 1, status: 1 });
learningSessionSchema.index({ userId: 1, status: 1, updatedAt: -1 });
learningSessionSchema.index({ userId: 1, subject: 1 });
learningSessionSchema.index({ userId: 1, learnerMode: 1 });
learningSessionSchema.index({ userId: 1, updatedAt: -1, studyDate: -1 });
exports.default = (0, mongoose_1.model)("LearningSession", learningSessionSchema);
