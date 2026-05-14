"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const learningNoteSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, trim: true, index: true },
    sessionId: { type: String, required: true, trim: true, index: true },
    summary: { type: String, default: "", trim: true },
    difficultPoints: { type: String, default: "", trim: true },
    nextAction: { type: String, default: "", trim: true },
    important: { type: Boolean, default: false },
}, { timestamps: true });
learningNoteSchema.index({ userId: 1, sessionId: 1, createdAt: -1 });
exports.default = (0, mongoose_1.model)("LearningNote", learningNoteSchema);
