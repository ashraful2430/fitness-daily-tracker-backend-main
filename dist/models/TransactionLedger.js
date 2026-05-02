"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSACTION_SOURCES = exports.TRANSACTION_TYPES = void 0;
const mongoose_1 = require("mongoose");
exports.TRANSACTION_TYPES = ["CREDIT", "DEBIT"];
exports.TRANSACTION_SOURCES = [
    "EXPENSE",
    "LOAN_GIVEN",
    "LOAN_REPAID",
    "SALARY_ADDED",
    "BALANCE_ADDED",
];
const transactionLedgerSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    type: {
        type: String,
        required: true,
        enum: exports.TRANSACTION_TYPES,
    },
    source: {
        type: String,
        required: true,
        enum: exports.TRANSACTION_SOURCES,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    referenceId: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
}, {
    timestamps: true,
});
transactionLedgerSchema.index({ userId: 1, createdAt: -1 });
exports.default = (0, mongoose_1.model)("TransactionLedger", transactionLedgerSchema);
