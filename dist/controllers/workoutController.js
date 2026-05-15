"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkouts = getWorkouts;
exports.createWorkout = createWorkout;
exports.updateWorkout = updateWorkout;
exports.deleteWorkout = deleteWorkout;
const Workout_1 = __importDefault(require("../models/Workout"));
async function getWorkouts(req, res) {
    try {
        const workouts = await Workout_1.default.find({ userId: req.userId }).sort({
            createdAt: -1,
        });
        return res.json({ workouts });
    }
    catch {
        return res.status(500).json({ message: "Failed to fetch workouts" });
    }
}
async function createWorkout(req, res) {
    try {
        const { title, duration, durationMinutes, type, workoutType, calories } = req.body;
        const normalizedDuration = durationMinutes ?? duration;
        const normalizedType = workoutType ?? type ?? "general";
        if (!title || !normalizedDuration) {
            return res.status(400).json({
                message: "Title and duration are required",
            });
        }
        const workout = await Workout_1.default.create({
            userId: req.userId,
            title,
            workoutDate: new Date(),
            durationMinutes: normalizedDuration,
            workoutType: String(normalizedType).toLowerCase(),
            goalType: "general_fitness",
            intensity: "medium",
            bodyPart: "full_body",
            calories,
        });
        return res.status(201).json({
            message: "Workout added successfully",
            workout,
        });
    }
    catch {
        return res.status(500).json({ message: "Failed to create workout" });
    }
}
async function updateWorkout(req, res) {
    try {
        const workout = await Workout_1.default.findOneAndUpdate({
            _id: req.params.id,
            userId: req.userId,
        }, req.body, { new: true });
        if (!workout) {
            return res.status(404).json({ message: "Workout not found" });
        }
        return res.json({
            message: "Workout updated successfully",
            workout,
        });
    }
    catch {
        return res.status(500).json({ message: "Failed to update workout" });
    }
}
async function deleteWorkout(req, res) {
    try {
        const workout = await Workout_1.default.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
        });
        if (!workout) {
            return res.status(404).json({ message: "Workout not found" });
        }
        return res.json({
            message: "Workout deleted successfully",
        });
    }
    catch {
        return res.status(500).json({ message: "Failed to delete workout" });
    }
}
