"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const incomeSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true },
    source: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
    date: { type: Date, required: true },
}, { timestamps: true });
incomeSchema.index({ userId: 1, createdAt: -1 });
incomeSchema.index({ userId: 1, date: -1 });
exports.default = (0, mongoose_1.model)("Income", incomeSchema);
