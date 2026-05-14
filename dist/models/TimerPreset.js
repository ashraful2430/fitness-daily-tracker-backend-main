"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const timerPresetSchema = new mongoose_1.Schema({
    userId: { type: String, default: null, index: true },
    label: { type: String, required: true, trim: true },
    minutes: { type: Number, required: true, min: 1, max: 600 },
    isDefault: { type: Boolean, default: false, index: true },
}, { timestamps: true });
timerPresetSchema.index({ userId: 1, label: 1 }, { unique: true, sparse: true });
exports.default = (0, mongoose_1.model)("TimerPreset", timerPresetSchema);
