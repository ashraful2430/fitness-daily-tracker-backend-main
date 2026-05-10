"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALANCE_ACCOUNT_SOURCES = exports.BALANCE_ACCOUNT_TYPES = void 0;
const mongoose_1 = require("mongoose");
exports.BALANCE_ACCOUNT_TYPES = [
    "CASH",
    "BANK",
    "SALARY",
    "EXTERNAL",
];
exports.BALANCE_ACCOUNT_SOURCES = [
    "USER_ADDED",
    "BALANCE_ADJUSTMENT",
    "EXPENSE_REFUND",
    "INCOME_ADDED",
    "SAVINGS_ADDED",
    "SALARY_ADDED",
    "LOAN_REPAID",
];
const balanceAccountSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    type: {
        type: String,
        required: true,
        enum: exports.BALANCE_ACCOUNT_TYPES,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    source: {
        type: String,
        required: true,
        enum: exports.BALANCE_ACCOUNT_SOURCES,
        default: "USER_ADDED",
        index: true,
    },
}, { timestamps: true });
balanceAccountSchema.index({ userId: 1, type: 1, createdAt: -1 });
exports.default = (0, mongoose_1.model)("BalanceAccount", balanceAccountSchema);
