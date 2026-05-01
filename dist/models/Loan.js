"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const loanSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
    },
    lender: {
        type: String,
        required: true,
        trim: true,
    },
    reason: {
        type: String,
        required: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    paidAmount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    status: {
        type: String,
        required: true,
        enum: ["open", "paid"],
        default: "open",
    },
    paidAt: {
        type: Date,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
}, {
    timestamps: true,
});
loanSchema.index({ userId: 1 });
exports.default = (0, mongoose_1.model)("Loan", loanSchema);
