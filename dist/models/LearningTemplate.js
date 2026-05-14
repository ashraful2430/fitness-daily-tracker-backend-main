"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const LearningSession_1 = require("./LearningSession");
const learningTemplateSchema = new mongoose_1.Schema({
    userId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    learnerMode: { type: String, enum: LearningSession_1.LEARNER_MODES, default: "self_learner" },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    goal: { type: String, default: "", trim: true },
    plannedMinutes: { type: Number, default: 25, min: 1, max: 600 },
    learningType: { type: String, enum: LearningSession_1.LEARNING_TYPES, default: "other" },
    difficulty: { type: String, enum: LearningSession_1.LEARNING_DIFFICULTIES, default: "medium" },
    priority: { type: String, enum: LearningSession_1.LEARNING_PRIORITIES, default: "medium" },
    notesPlaceholder: { type: String, default: "", trim: true },
    isDefault: { type: Boolean, default: false },
}, { timestamps: true });
learningTemplateSchema.index({ userId: 1, name: 1 }, { unique: true, sparse: true });
exports.default = (0, mongoose_1.model)("LearningTemplate", learningTemplateSchema);
