"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALANCE_ACCOUNT_TYPES = void 0;
const mongoose_1 = require("mongoose");
exports.BALANCE_ACCOUNT_TYPES = [
    "CASH",
    "BANK",
    "SALARY",
    "EXTERNAL",
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
}, { timestamps: true });
balanceAccountSchema.index({ userId: 1, type: 1, createdAt: -1 });
exports.default = (0, mongoose_1.model)("BalanceAccount", balanceAccountSchema);
