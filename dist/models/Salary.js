"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const salarySchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
}, {
    timestamps: true,
});
salarySchema.index({ userId: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("Salary", salarySchema);
