"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLearningSession = createLearningSession;
exports.updateLearningSession = updateLearningSession;
exports.deleteLearningSession = deleteLearningSession;
exports.getLearningSessions = getLearningSessions;
exports.getLearningSummary = getLearningSummary;
const learningService_1 = require("../services/learningService");
const learningValidation_1 = require("../validation/learningValidation");
function getErrorMessage(error) {
    return error instanceof Error ? error.message : "Server error";
}
function getUserId(req) {
    return req.userId;
}
function getRouteId(req) {
    return typeof req.params.id === "string" ? req.params.id : "";
}
async function createLearningSession(req, res) {
    const userId = getUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const validation = (0, learningValidation_1.validateCreateLearningSession)(req.body);
    if (!validation.success) {
        return res.status(400).json({ success: false, message: validation.message });
    }
    try {
        const result = await (0, learningService_1.createLearningSession)(userId, validation.data);
        if ("error" in result) {
            return res.status(result.status).json({
                success: false,
                message: result.error,
            });
        }
        return res.status(201).json({
            success: true,
            data: result.data,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
}
async function updateLearningSession(req, res) {
    const userId = getUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const validation = (0, learningValidation_1.validateUpdateLearningSession)(req.body);
    if (!validation.success) {
        return res.status(400).json({ success: false, message: validation.message });
    }
    const sessionId = getRouteId(req);
    if (!sessionId) {
        return res.status(400).json({
            success: false,
            message: "A valid session id is required.",
        });
    }
    try {
        const result = await (0, learningService_1.updateLearningSession)(userId, sessionId, validation.data);
        if ("error" in result) {
            return res.status(result.status).json({
                success: false,
                message: result.error,
            });
        }
        return res.status(200).json({
            success: true,
            data: result.data,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
}
async function deleteLearningSession(req, res) {
    const userId = getUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const sessionId = getRouteId(req);
    if (!sessionId) {
        return res.status(400).json({
            success: false,
            message: "A valid session id is required.",
        });
    }
    try {
        const result = await (0, learningService_1.deleteLearningSession)(userId, sessionId);
        if ("error" in result) {
            return res.status(result.status).json({
                success: false,
                message: result.error,
            });
        }
        return res.status(200).json({
            success: true,
            data: result.data,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
}
async function getLearningSessions(req, res) {
    const userId = getUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const validation = (0, learningValidation_1.validateLearningSessionListQuery)(req.query);
    if (!validation.success) {
        return res.status(400).json({ success: false, message: validation.message });
    }
    try {
        const result = await (0, learningService_1.listLearningSessions)(userId, validation.data);
        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
}
async function getLearningSummary(req, res) {
    const userId = getUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
        const result = await (0, learningService_1.getLearningSummary)(userId);
        return res.status(200).json({
            success: true,
            data: result.data,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
}
