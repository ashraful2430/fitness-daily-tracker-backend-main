"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LOAN_REASON = exports.LOAN_DEBT_STATUSES = void 0;
const mongoose_1 = require("mongoose");
exports.LOAN_DEBT_STATUSES = ["ACTIVE", "PARTIALLY_PAID", "PAID"];
exports.DEFAULT_LOAN_REASON = "No reason provided.";
const loanDebtSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    personName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paidAmount: { type: Number, required: true, default: 0 },
    reason: { type: String, default: exports.DEFAULT_LOAN_REASON, trim: true },
    date: { type: Date, required: true },
    status: {
        type: String,
        required: true,
        enum: exports.LOAN_DEBT_STATUSES,
        default: "ACTIVE",
    },
    linkedLendingId: { type: String },
}, { timestamps: true });
loanDebtSchema.index({ userId: 1, status: 1 });
loanDebtSchema.index({ userId: 1, createdAt: -1 });
loanDebtSchema.index({ userId: 1, linkedLendingId: 1 });
exports.default = (0, mongoose_1.model)("LoanDebt", loanDebtSchema);
