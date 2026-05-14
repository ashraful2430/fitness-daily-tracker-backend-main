"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const childLearningControlSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, trim: true, unique: true, index: true },
    parentPinHash: { type: String, required: true },
    dailyLimitMinutes: { type: Number, default: 60, min: 1, max: 600 },
    rewardPointsEnabled: { type: Boolean, default: true },
    allowedSubjects: { type: [String], default: [] },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("ChildLearningControl", childLearningControlSchema);
