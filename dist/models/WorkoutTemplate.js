"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const fitness_1 = require("../constants/fitness");
const WorkoutTemplateSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    goalType: {
        type: String,
        required: true,
        enum: fitness_1.FITNESS_GOAL_TYPES,
        default: "general_fitness",
    },
    title: { type: String, required: true, trim: true },
    workoutType: {
        type: String,
        required: true,
        enum: fitness_1.WORKOUT_TYPES,
        default: "general",
    },
    durationMinutes: { type: Number, required: true, min: 1, max: 600 },
    caloriesEstimate: { type: Number, default: 0, min: 0 },
    intensity: {
        type: String,
        required: true,
        enum: fitness_1.WORKOUT_INTENSITIES,
        default: "medium",
    },
    bodyPart: {
        type: String,
        required: true,
        enum: fitness_1.BODY_PARTS,
        default: "full_body",
    },
    notesPlaceholder: { type: String, trim: true, default: "" },
    isDefault: { type: Boolean, default: false },
}, { timestamps: true });
WorkoutTemplateSchema.index({ name: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });
WorkoutTemplateSchema.index({ userId: 1, createdAt: -1 });
exports.default = mongoose_1.default.model("WorkoutTemplate", WorkoutTemplateSchema);
