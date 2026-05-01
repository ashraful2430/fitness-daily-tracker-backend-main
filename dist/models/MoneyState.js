"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const moneyStateSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    lastExpenseResetMonth: {
        type: String,
        required: true,
        trim: true,
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("MoneyState", moneyStateSchema);
