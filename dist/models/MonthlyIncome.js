"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const monthlyIncomeSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, trim: true, index: true },
    year: { type: Number, required: true, min: 1900, max: 9999, index: true },
    month: { type: Number, required: true, min: 1, max: 12, index: true },
    totalIncome: { type: Number, default: 0, min: 0 },
    salaryIncome: { type: Number, default: 0, min: 0 },
    externalIncome: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
monthlyIncomeSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("MonthlyIncome", monthlyIncomeSchema);
