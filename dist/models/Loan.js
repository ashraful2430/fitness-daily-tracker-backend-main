"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOAN_STATUS_TYPES = exports.LOAN_SOURCE_TYPES = void 0;
const mongoose_1 = require("mongoose");
exports.LOAN_SOURCE_TYPES = ["PERSONAL", "BORROWED"];
exports.LOAN_STATUS_TYPES = ["ACTIVE", "PARTIAL", "CLOSED"];
const loanSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    borrower: {
        type: String,
        required: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    remainingAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    sourceType: {
        type: String,
        required: true,
        enum: exports.LOAN_SOURCE_TYPES,
    },
    status: {
        type: String,
        required: true,
        enum: exports.LOAN_STATUS_TYPES,
        default: "ACTIVE",
    },
}, {
    timestamps: true,
});
loanSchema.index({ userId: 1, status: 1 });
exports.default = (0, mongoose_1.model)("Loan", loanSchema);
