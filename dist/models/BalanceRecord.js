"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const balanceRecordSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
    },
}, {
    timestamps: true,
});
balanceRecordSchema.index({ userId: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("BalanceRecord", balanceRecordSchema);
