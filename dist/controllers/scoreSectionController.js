"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProgress = exports.deleteSection = exports.updateSection = exports.createSection = exports.getSections = void 0;
const ScoreSection_1 = require("../models/ScoreSection");
const MAX_SECTIONS = 10;
function todayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
// GET /api/score-sections
const getSections = async (req, res) => {
    try {
        const userId = req.userId;
        const today = todayStart();
        const sections = await ScoreSection_1.ScoreSection.find({ userId, date: today })
            .sort({ order: 1 })
            .lean();
        res.json({ success: true, data: sections });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.getSections = getSections;
// POST /api/score-sections
const createSection = async (req, res) => {
    try {
        const userId = req.userId;
        const today = todayStart();
        const count = await ScoreSection_1.ScoreSection.countDocuments({ userId, date: today });
        if (count >= MAX_SECTIONS) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${MAX_SECTIONS} sections allowed per day`,
            });
        }
        const { name, emoji, goalType, goalValue } = req.body;
        const section = await ScoreSection_1.ScoreSection.create({
            userId,
            name,
            emoji,
            goalType,
            goalValue: goalType === "boolean" ? 1 : goalValue,
            currentValue: 0,
            date: today,
            order: count,
        });
        res.status(201).json({ success: true, data: section });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createSection = createSection;
// PATCH /api/score-sections/:id
const updateSection = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const updates = req.body;
        const section = await ScoreSection_1.ScoreSection.findOneAndUpdate({ _id: id, userId }, { $set: updates }, { new: true });
        if (!section) {
            return res
                .status(404)
                .json({ success: false, message: "Section not found" });
        }
        res.json({ success: true, data: section });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateSection = updateSection;
// DELETE /api/score-sections/:id
const deleteSection = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const section = await ScoreSection_1.ScoreSection.findOneAndDelete({ _id: id, userId });
        if (!section) {
            return res
                .status(404)
                .json({ success: false, message: "Section not found" });
        }
        res.json({ success: true, message: "Section deleted" });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.deleteSection = deleteSection;
// PATCH /api/score-sections/:id/progress
const updateProgress = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { value } = req.body;
        const section = await ScoreSection_1.ScoreSection.findOneAndUpdate({ _id: id, userId }, { $set: { currentValue: Math.max(0, value) } }, { new: true });
        if (!section) {
            return res
                .status(404)
                .json({ success: false, message: "Section not found" });
        }
        res.json({ success: true, data: section });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.updateProgress = updateProgress;
