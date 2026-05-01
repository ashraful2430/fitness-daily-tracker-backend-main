"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const categorySchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
}, {
    timestamps: true,
});
categorySchema.index({ userId: 1, name: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("Category", categorySchema);
