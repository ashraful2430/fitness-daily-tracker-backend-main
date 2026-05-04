"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const expenseSchema = new mongoose_1.Schema({
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
    description: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
expenseSchema
    .virtual("note")
    .get(function () {
    return this.description;
})
    .set(function (value) {
    this.description = value;
});
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });
exports.default = (0, mongoose_1.model)("Expense", expenseSchema);
