"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LENDING_STATUSES = exports.FUNDING_SOURCES = void 0;
const mongoose_1 = require("mongoose");
exports.FUNDING_SOURCES = ["PERSONAL", "BORROWED"];
exports.LENDING_STATUSES = ["ACTIVE", "PARTIALLY_REPAID", "REPAID"];
const lendingSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    personName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    repaidAmount: { type: Number, required: true, default: 0 },
    fundingSource: {
        type: String,
        required: true,
        enum: exports.FUNDING_SOURCES,
    },
    date: { type: Date, required: true },
    status: {
        type: String,
        required: true,
        enum: exports.LENDING_STATUSES,
        default: "ACTIVE",
    },
    linkedLoanId: { type: String },
}, { timestamps: true });
lendingSchema.index({ userId: 1, status: 1 });
lendingSchema.index({ userId: 1, createdAt: -1 });
lendingSchema.index({ userId: 1, linkedLoanId: 1 });
exports.default = (0, mongoose_1.model)("Lending", lendingSchema);
