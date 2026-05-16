"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLearningAlarmSounds = getLearningAlarmSounds;
exports.postLearningAlarmSound = postLearningAlarmSound;
exports.deleteLearningAlarmSound = deleteLearningAlarmSound;
const mongoose_1 = __importDefault(require("mongoose"));
const LearningAlarmSound_1 = __importDefault(require("../models/LearningAlarmSound"));
function serializeAlarmSound(sound) {
    return {
        id: String(sound._id),
        name: sound.name,
        url: sound.url,
        createdAt: sound.createdAt,
        updatedAt: sound.updatedAt,
    };
}
function getString(value) {
    return typeof value === "string" ? value.trim() : "";
}
async function getLearningAlarmSounds(req, res) {
    try {
        const sounds = await LearningAlarmSound_1.default.find({ userId: req.userId }).sort({
            createdAt: -1,
        });
        return res.json({
            success: true,
            data: sounds.map(serializeAlarmSound),
        });
    }
    catch {
        return res.status(500).json({
            success: false,
            message: "Failed to load alarm sounds",
        });
    }
}
async function postLearningAlarmSound(req, res) {
    try {
        const name = getString(req.body?.name ?? req.body?.label);
        const url = getString(req.body?.url ?? req.body?.soundUrl);
        if (!name || !url) {
            return res.status(400).json({
                success: false,
                message: "name and url are required",
            });
        }
        const sound = await LearningAlarmSound_1.default.create({
            userId: req.userId,
            name,
            url,
        });
        return res.status(201).json({
            success: true,
            data: serializeAlarmSound(sound),
        });
    }
    catch {
        return res.status(500).json({
            success: false,
            message: "Failed to save alarm sound",
        });
    }
}
async function deleteLearningAlarmSound(req, res) {
    try {
        const id = getString(req.query.id ?? req.body?.id ?? req.body?.soundId);
        const url = getString(req.query.url ?? req.body?.url ?? req.body?.soundUrl);
        if (!id && !url) {
            return res.status(400).json({
                success: false,
                message: "Provide id or url to delete an alarm sound",
            });
        }
        const query = id
            ? {
                _id: id,
                userId: req.userId,
            }
            : {
                url,
                userId: req.userId,
            };
        if (id && !mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid alarm sound id",
            });
        }
        const sound = await LearningAlarmSound_1.default.findOneAndDelete(query);
        if (!sound) {
            return res.status(404).json({
                success: false,
                message: "Alarm sound not found",
            });
        }
        return res.json({
            success: true,
            data: { id: String(sound._id) },
        });
    }
    catch {
        return res.status(500).json({
            success: false,
            message: "Failed to delete alarm sound",
        });
    }
}
