"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminFeedbackEffects = getAdminFeedbackEffects;
exports.upsertAdminFeedbackEffect = upsertAdminFeedbackEffect;
exports.patchAdminFeedbackEffect = patchAdminFeedbackEffect;
exports.deleteAdminFeedbackEffect = deleteAdminFeedbackEffect;
exports.uploadAdminFeedbackAsset = uploadAdminFeedbackAsset;
exports.getFeedbackEffects = getFeedbackEffects;
const mongoose_1 = __importDefault(require("mongoose"));
const feedbackEffects_1 = require("../constants/feedbackEffects");
const FeedbackEffect_1 = __importDefault(require("../models/FeedbackEffect"));
const feedbackAssetStorageService_1 = require("../services/feedbackAssetStorageService");
function serializeFeedbackEffect(effect) {
    return {
        id: String(effect._id),
        key: effect.key,
        label: effect.label,
        category: effect.category,
        description: effect.description ?? null,
        soundUrl: effect.soundUrl ?? null,
        memeImageUrl: effect.memeImageUrl ?? null,
        enabled: effect.enabled,
        createdAt: effect.createdAt,
        updatedAt: effect.updatedAt,
    };
}
function serializePublicFeedbackEffect(effect) {
    return {
        key: effect.key,
        label: effect.label,
        category: effect.category,
        description: effect.description ?? null,
        soundUrl: effect.soundUrl ?? null,
        memeImageUrl: effect.memeImageUrl ?? null,
        enabled: effect.enabled,
    };
}
function normalizeOptionalString(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed || null;
}
function validateFeedbackKey(key) {
    if (typeof key !== "string" || !key.trim()) {
        return "key is required";
    }
    if (!feedbackEffects_1.ALLOWED_FEEDBACK_EFFECT_KEYS.has(key.trim())) {
        return "Unsupported feedback effect key";
    }
    return null;
}
function validateCategory(category) {
    if (typeof category !== "string" || !category.trim()) {
        return "category is required";
    }
    if (!feedbackEffects_1.ALLOWED_FEEDBACK_EFFECT_CATEGORIES.has(category.trim())) {
        return "Unsupported feedback effect category";
    }
    return null;
}
function buildRequiredPayload(body) {
    const keyError = validateFeedbackKey(body.key);
    if (keyError)
        return { error: keyError };
    const categoryError = validateCategory(body.category);
    if (categoryError)
        return { error: categoryError };
    if (typeof body.label !== "string" || !body.label.trim()) {
        return { error: "label is required" };
    }
    if (body.enabled !== undefined &&
        typeof body.enabled !== "boolean") {
        return { error: "enabled must be boolean" };
    }
    const key = body.key;
    const label = body.label;
    const category = body.category;
    return {
        payload: {
            key: key.trim(),
            label: label.trim(),
            category: category.trim(),
            description: normalizeOptionalString(body.description),
            soundUrl: normalizeOptionalString(body.soundUrl),
            memeImageUrl: normalizeOptionalString(body.memeImageUrl),
            ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
        },
    };
}
function buildPatchPayload(body) {
    const payload = {};
    if (body.key !== undefined) {
        const keyError = validateFeedbackKey(body.key);
        if (keyError)
            return { error: keyError };
        payload.key = body.key.trim();
    }
    if (body.category !== undefined) {
        const categoryError = validateCategory(body.category);
        if (categoryError)
            return { error: categoryError };
        payload.category = body.category.trim();
    }
    if (body.label !== undefined) {
        if (typeof body.label !== "string" || !body.label.trim()) {
            return { error: "label cannot be empty" };
        }
        payload.label = body.label.trim();
    }
    for (const field of ["description", "soundUrl", "memeImageUrl"]) {
        const normalized = normalizeOptionalString(body[field]);
        if (normalized !== undefined) {
            payload[field] = normalized;
        }
        else if (body[field] !== undefined) {
            return { error: `${field} must be a string or null` };
        }
    }
    if (body.enabled !== undefined) {
        if (typeof body.enabled !== "boolean") {
            return { error: "enabled must be boolean" };
        }
        payload.enabled = body.enabled;
    }
    return { payload };
}
function getStringParam(value) {
    return Array.isArray(value) ? value[0] : value;
}
async function getAdminFeedbackEffects(_req, res) {
    try {
        const effects = await FeedbackEffect_1.default.find()
            .sort({ category: 1, key: 1 })
            .lean();
        return res.status(200).json({
            success: true,
            data: effects.map(serializeFeedbackEffect),
        });
    }
    catch {
        return res.status(500).json({
            success: false,
            message: "Failed to load feedback effects",
        });
    }
}
async function upsertAdminFeedbackEffect(req, res) {
    try {
        const result = buildRequiredPayload(req.body);
        if ("error" in result) {
            return res.status(400).json({ success: false, message: result.error });
        }
        const effect = await FeedbackEffect_1.default.findOneAndUpdate({ key: result.payload.key }, {
            $set: {
                ...result.payload,
                updatedBy: req.userId,
            },
            $setOnInsert: {
                createdBy: req.userId,
            },
        }, {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
        });
        return res.status(200).json({
            success: true,
            data: effect ? serializeFeedbackEffect(effect) : null,
        });
    }
    catch {
        return res.status(500).json({
            success: false,
            message: "Failed to save feedback effect",
        });
    }
}
async function patchAdminFeedbackEffect(req, res) {
    try {
        const id = getStringParam(req.params.id);
        if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid feedback effect id",
            });
        }
        const result = buildPatchPayload(req.body);
        if ("error" in result) {
            return res.status(400).json({ success: false, message: result.error });
        }
        const effect = await FeedbackEffect_1.default.findByIdAndUpdate(id, {
            $set: {
                ...result.payload,
                updatedBy: req.userId,
            },
        }, { new: true, runValidators: true });
        if (!effect) {
            return res.status(404).json({
                success: false,
                message: "Feedback effect not found",
            });
        }
        return res.status(200).json({
            success: true,
            data: serializeFeedbackEffect(effect),
        });
    }
    catch {
        return res.status(500).json({
            success: false,
            message: "Failed to update feedback effect",
        });
    }
}
async function deleteAdminFeedbackEffect(req, res) {
    try {
        const id = getStringParam(req.params.id);
        if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid feedback effect id",
            });
        }
        const effect = await FeedbackEffect_1.default.findByIdAndDelete(id);
        if (!effect) {
            return res.status(404).json({
                success: false,
                message: "Feedback effect not found",
            });
        }
        return res.status(200).json({
            success: true,
            data: { id },
        });
    }
    catch {
        return res.status(500).json({
            success: false,
            message: "Failed to delete feedback effect",
        });
    }
}
async function uploadAdminFeedbackAsset(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Upload a file using the file field",
            });
        }
        const uploaded = await (0, feedbackAssetStorageService_1.storeFeedbackAsset)(req, req.file);
        return res.status(201).json(uploaded);
    }
    catch {
        return res.status(500).json({
            success: false,
            message: "Failed to upload feedback asset",
        });
    }
}
async function getFeedbackEffects(_req, res) {
    try {
        const effects = await FeedbackEffect_1.default.find({ enabled: true })
            .sort({ category: 1, key: 1 })
            .lean();
        return res.status(200).json({
            success: true,
            data: effects.map(serializePublicFeedbackEffect),
        });
    }
    catch {
        return res.status(500).json({
            success: false,
            message: "Failed to load feedback effects",
        });
    }
}
