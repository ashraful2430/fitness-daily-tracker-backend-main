"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const externalDebtSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    creditor: {
        type: String,
        required: true,
        trim: true,
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    remainingAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
}, {
    timestamps: true,
});
externalDebtSchema.index({ userId: 1, creditor: 1 }, { unique: true });
externalDebtSchema.index({ userId: 1, updatedAt: -1 });
exports.default = (0, mongoose_1.model)("ExternalDebt", externalDebtSchema);
