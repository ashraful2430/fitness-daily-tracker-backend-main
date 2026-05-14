"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLearningSessions = getLearningSessions;
exports.createLearningSession = createLearningSession;
exports.getLearningSession = getLearningSession;
exports.patchLearningSession = patchLearningSession;
exports.removeLearningSession = removeLearningSession;
exports.startLearningSession = startLearningSession;
exports.pauseLearningSession = pauseLearningSession;
exports.resumeLearningSession = resumeLearningSession;
exports.completeLearningSession = completeLearningSession;
exports.cancelLearningSession = cancelLearningSession;
exports.rescheduleLearningSession = rescheduleLearningSession;
exports.getLearningTimerPresets = getLearningTimerPresets;
exports.postLearningTimerPreset = postLearningTimerPreset;
exports.patchLearningTimerPreset = patchLearningTimerPreset;
exports.removeLearningTimerPreset = removeLearningTimerPreset;
exports.getLearningTemplates = getLearningTemplates;
exports.postLearningTemplate = postLearningTemplate;
exports.getLearningGoals = getLearningGoals;
exports.putLearningGoals = putLearningGoals;
exports.getLearningStats = getLearningStats;
exports.getLearningChildControls = getLearningChildControls;
exports.putLearningChildControls = putLearningChildControls;
exports.getLearningSessionNotes = getLearningSessionNotes;
exports.postLearningSessionNote = postLearningSessionNote;
exports.patchLearningNote = patchLearningNote;
exports.removeLearningNote = removeLearningNote;
const learningService_1 = require("../services/learningService");
const learningValidation_1 = require("../validation/learningValidation");
function unauthorized(res) {
    return res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
}
function ok(res, data, message = "Operation successful") {
    return res.status(200).json({ success: true, message, data });
}
function badRequest(res, message) {
    return res.status(400).json({ success: false, message, errors: [] });
}
function notFound(res, message = "Resource not found") {
    return res.status(404).json({ success: false, message, errors: [] });
}
function userId(req) {
    return req.userId;
}
function routeId(req, key) {
    const value = req.params[key];
    return typeof value === "string" ? value : "";
}
async function getLearningSessions(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const validation = (0, learningValidation_1.validateLearningRequest)("listSessions", req.query);
    if (!validation.success)
        return badRequest(res, validation.message);
    const result = await (0, learningService_1.listSessions)(uid, validation.data);
    return ok(res, { items: result.rows, pagination: result.pagination });
}
async function createLearningSession(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const validation = (0, learningValidation_1.validateLearningRequest)("createSession", req.body);
    if (!validation.success)
        return badRequest(res, validation.message);
    const row = await (0, learningService_1.createSession)(uid, validation.data);
    return res.status(201).json({ success: true, message: "Operation successful", data: row });
}
async function getLearningSession(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const id = routeId(req, "id");
    const row = await (0, learningService_1.getSessionById)(uid, id);
    if (!row)
        return notFound(res, "Learning session not found");
    return ok(res, row);
}
async function patchLearningSession(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const id = routeId(req, "id");
    const validation = (0, learningValidation_1.validateLearningRequest)("updateSession", req.body);
    if (!validation.success)
        return badRequest(res, validation.message);
    const row = await (0, learningService_1.updateSession)(uid, id, validation.data);
    if (!row)
        return notFound(res, "Learning session not found");
    return ok(res, row);
}
async function removeLearningSession(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const id = routeId(req, "id");
    const row = await (0, learningService_1.deleteSession)(uid, id);
    if (!row)
        return notFound(res, "Learning session not found");
    return ok(res, { deleted: true });
}
async function startLearningSession(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const row = await (0, learningService_1.startSession)(uid, routeId(req, "id"));
    if (!row)
        return notFound(res, "Learning session not found");
    return ok(res, row);
}
async function pauseLearningSession(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const row = await (0, learningService_1.pauseSession)(uid, routeId(req, "id"));
    if (!row)
        return notFound(res, "Learning session not found");
    return ok(res, row);
}
async function resumeLearningSession(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const row = await (0, learningService_1.resumeSession)(uid, routeId(req, "id"));
    if (!row)
        return notFound(res, "Learning session not found");
    return ok(res, row);
}
async function completeLearningSession(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const actualMinutes = typeof req.body?.actualMinutes === "number" ? req.body.actualMinutes : undefined;
    if (actualMinutes !== undefined && actualMinutes < 0)
        return badRequest(res, "actualMinutes must be 0 or more");
    const row = await (0, learningService_1.completeSession)(uid, routeId(req, "id"), actualMinutes);
    if (!row)
        return notFound(res, "Learning session not found");
    return ok(res, row);
}
async function cancelLearningSession(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const row = await (0, learningService_1.cancelSession)(uid, routeId(req, "id"));
    if (!row)
        return notFound(res, "Learning session not found");
    return ok(res, row);
}
async function rescheduleLearningSession(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const validation = (0, learningValidation_1.validateLearningRequest)("rescheduleSession", req.body);
    if (!validation.success)
        return badRequest(res, validation.message);
    const row = await (0, learningService_1.rescheduleSession)(uid, routeId(req, "id"), validation.data.studyDate);
    if (!row)
        return notFound(res, "Learning session not found");
    return ok(res, row);
}
async function getLearningTimerPresets(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const rows = await (0, learningService_1.getTimerPresets)(uid);
    return ok(res, rows);
}
async function postLearningTimerPreset(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const validation = (0, learningValidation_1.validateLearningRequest)("timerPreset", req.body);
    if (!validation.success)
        return badRequest(res, validation.message);
    const row = await (0, learningService_1.createTimerPreset)(uid, validation.data.label, validation.data.minutes);
    return res.status(201).json({ success: true, message: "Operation successful", data: row });
}
async function patchLearningTimerPreset(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const validation = (0, learningValidation_1.validateLearningRequest)("timerPresetPatch", req.body);
    if (!validation.success)
        return badRequest(res, validation.message);
    const row = await (0, learningService_1.updateTimerPreset)(uid, routeId(req, "id"), validation.data);
    if (!row)
        return badRequest(res, "Preset not found or default preset cannot be edited");
    return ok(res, row);
}
async function removeLearningTimerPreset(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const row = await (0, learningService_1.deleteTimerPreset)(uid, routeId(req, "id"));
    if (!row)
        return badRequest(res, "Preset not found or default preset cannot be deleted");
    return ok(res, { deleted: true });
}
async function getLearningTemplates(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    return ok(res, await (0, learningService_1.getTemplates)(uid));
}
async function postLearningTemplate(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const validation = (0, learningValidation_1.validateLearningRequest)("template", req.body);
    if (!validation.success)
        return badRequest(res, validation.message);
    const row = await (0, learningService_1.createTemplate)(uid, validation.data);
    return res.status(201).json({ success: true, message: "Operation successful", data: row });
}
async function getLearningGoals(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    return ok(res, await (0, learningService_1.getGoals)(uid));
}
async function putLearningGoals(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const validation = (0, learningValidation_1.validateLearningRequest)("goals", req.body);
    if (!validation.success)
        return badRequest(res, validation.message);
    return ok(res, await (0, learningService_1.upsertGoals)(uid, validation.data));
}
async function getLearningStats(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    return ok(res, await (0, learningService_1.getStats)(uid));
}
async function getLearningChildControls(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    return ok(res, (await (0, learningService_1.getChildControls)(uid)) ?? null);
}
async function putLearningChildControls(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const validation = (0, learningValidation_1.validateLearningRequest)("childControls", req.body);
    if (!validation.success)
        return badRequest(res, validation.message);
    return ok(res, await (0, learningService_1.upsertChildControls)(uid, validation.data));
}
async function getLearningSessionNotes(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    return ok(res, await (0, learningService_1.listSessionNotes)(uid, routeId(req, "id")));
}
async function postLearningSessionNote(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const validation = (0, learningValidation_1.validateLearningRequest)("note", req.body);
    if (!validation.success)
        return badRequest(res, validation.message);
    const row = await (0, learningService_1.createSessionNote)(uid, routeId(req, "id"), validation.data);
    if (!row)
        return notFound(res, "Learning session not found");
    return res.status(201).json({ success: true, message: "Operation successful", data: row });
}
async function patchLearningNote(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const validation = (0, learningValidation_1.validateLearningRequest)("notePatch", req.body);
    if (!validation.success)
        return badRequest(res, validation.message);
    const row = await (0, learningService_1.updateNote)(uid, routeId(req, "noteId"), validation.data);
    if (!row)
        return notFound(res, "Learning note not found");
    return ok(res, row);
}
async function removeLearningNote(req, res) {
    const uid = userId(req);
    if (!uid)
        return unauthorized(res);
    const row = await (0, learningService_1.deleteNote)(uid, routeId(req, "noteId"));
    if (!row)
        return notFound(res, "Learning note not found");
    return ok(res, { deleted: true });
}
