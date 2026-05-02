"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const salaryMonthSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
    },
    year: {
        type: Number,
        required: true,
        min: 1900,
    },
    totalSalary: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    totalSpent: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    remainingSalary: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
}, {
    timestamps: true,
});
salaryMonthSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("SalaryMonth", salaryMonthSchema);
