"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLearningRequest = validateLearningRequest;
exports.validateCreateLearningSession = validateCreateLearningSession;
exports.validateUpdateLearningSession = validateUpdateLearningSession;
exports.validateLearningSessionListQuery = validateLearningSessionListQuery;
const LearningSession_1 = require("../models/LearningSession");
function isDateKey(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function pickString(value, field, required = false) {
    const v = typeof value === "string" ? value.trim() : "";
    if (required && !v)
        return { ok: false, message: `${field} is required` };
    return { ok: true, value: v };
}
function pickNumber(value, field, min, max, required = false) {
    if (value === undefined && !required)
        return { ok: true, value: undefined };
    if (typeof value !== "number" || Number.isNaN(value))
        return { ok: false, message: `${field} must be a number` };
    if (value < min)
        return { ok: false, message: `${field} must be at least ${min}` };
    if (typeof max === "number" && value > max)
        return { ok: false, message: `${field} must be at most ${max}` };
    return { ok: true, value };
}
function inEnum(value, values, field, required = false) {
    if (value === undefined && !required)
        return { ok: true, value: undefined };
    if (typeof value !== "string" || !values.includes(value)) {
        return { ok: false, message: `${field} must be one of: ${values.join(", ")}` };
    }
    return { ok: true, value };
}
function validateLearningRequest(type, payload) {
    if (type === "listSessions") {
        const page = Number.parseInt(String(payload.page ?? "1"), 10);
        const limit = Number.parseInt(String(payload.limit ?? "20"), 10);
        if (!Number.isInteger(page) || page < 1)
            return { success: false, message: "page must be a positive integer" };
        if (!Number.isInteger(limit) || limit < 1 || limit > 100)
            return { success: false, message: "limit must be between 1 and 100" };
        return {
            success: true,
            data: {
                status: payload.status,
                subject: payload.subject,
                learnerMode: payload.learnerMode,
                studyDate: payload.studyDate,
                fromDate: payload.fromDate,
                toDate: payload.toDate,
                page,
                limit,
            },
        };
    }
    if (type === "createSession" || type === "updateSession") {
        const required = type === "createSession";
        const title = pickString(payload.title, "title", required);
        if (!title.ok)
            return { success: false, message: title.message };
        const subject = pickString(payload.subject, "subject", required);
        if (!subject.ok)
            return { success: false, message: subject.message };
        const plannedMinutes = pickNumber(payload.plannedMinutes, "plannedMinutes", 1, 600, required);
        if (!plannedMinutes.ok)
            return { success: false, message: plannedMinutes.message };
        const actualMinutes = pickNumber(payload.actualMinutes, "actualMinutes", 0);
        if (!actualMinutes.ok)
            return { success: false, message: actualMinutes.message };
        if (required && !isDateKey(payload.studyDate))
            return { success: false, message: "studyDate must be valid YYYY-MM-DD" };
        if (!required && payload.studyDate !== undefined && !isDateKey(payload.studyDate))
            return { success: false, message: "studyDate must be valid YYYY-MM-DD" };
        const learnerMode = inEnum(payload.learnerMode, LearningSession_1.LEARNER_MODES, "learnerMode", required);
        if (!learnerMode.ok)
            return { success: false, message: learnerMode.message };
        const status = inEnum(payload.status, LearningSession_1.LEARNING_SESSION_STATUSES, "status");
        if (!status.ok)
            return { success: false, message: status.message };
        const learningType = inEnum(payload.learningType, LearningSession_1.LEARNING_TYPES, "learningType");
        if (!learningType.ok)
            return { success: false, message: learningType.message };
        const difficulty = inEnum(payload.difficulty, LearningSession_1.LEARNING_DIFFICULTIES, "difficulty");
        if (!difficulty.ok)
            return { success: false, message: difficulty.message };
        const priority = inEnum(payload.priority, LearningSession_1.LEARNING_PRIORITIES, "priority");
        if (!priority.ok)
            return { success: false, message: priority.message };
        const data = {};
        const entries = [
            ["title", title.value],
            ["subject", subject.value],
            ["goal", typeof payload.goal === "string" ? payload.goal.trim() : undefined],
            ["plannedMinutes", plannedMinutes.value],
            ["actualMinutes", actualMinutes.value],
            ["studyDate", payload.studyDate],
            ["learnerMode", learnerMode.value],
            ["status", status.value],
            ["learningType", learningType.value],
            ["difficulty", difficulty.value],
            ["priority", priority.value],
            ["notes", typeof payload.notes === "string" ? payload.notes.trim() : payload.notes],
            ["startedAt", payload.startedAt ? new Date(payload.startedAt) : payload.startedAt],
            ["pausedAt", payload.pausedAt ? new Date(payload.pausedAt) : payload.pausedAt],
            ["completedAt", payload.completedAt ? new Date(payload.completedAt) : payload.completedAt],
            ["alarmEnabled", payload.alarmEnabled],
            ["alarmSound", payload.alarmSound],
            ["breakEnabled", payload.breakEnabled],
            ["breakMinutes", payload.breakMinutes],
            ["tags", Array.isArray(payload.tags) ? payload.tags.map((t) => String(t).trim()).filter(Boolean) : undefined],
        ];
        for (const [k, v] of entries) {
            if (v !== undefined)
                data[k] = v;
        }
        return { success: true, data };
    }
    if (type === "rescheduleSession") {
        if (!isDateKey(payload.studyDate))
            return { success: false, message: "studyDate must be valid YYYY-MM-DD" };
        return { success: true, data: { studyDate: payload.studyDate } };
    }
    if (type === "timerPreset" || type === "timerPresetPatch") {
        const required = type === "timerPreset";
        const label = pickString(payload.label, "label", required);
        if (!label.ok)
            return { success: false, message: label.message };
        const minutes = pickNumber(payload.minutes, "minutes", 1, 600, required);
        if (!minutes.ok)
            return { success: false, message: minutes.message };
        const data = {};
        if (label.value !== undefined)
            data.label = label.value;
        if (minutes.value !== undefined)
            data.minutes = minutes.value;
        return { success: true, data };
    }
    if (type === "template") {
        const base = validateLearningRequest("createSession", payload);
        if (!base.success)
            return base;
        const name = pickString(payload.name, "name", true);
        if (!name.ok)
            return { success: false, message: name.message };
        return {
            success: true,
            data: {
                ...base.data,
                name: name.value,
                notesPlaceholder: typeof payload.notesPlaceholder === "string" ? payload.notesPlaceholder.trim() : "",
            },
        };
    }
    if (type === "goals") {
        const daily = pickNumber(payload.dailyGoalMinutes, "dailyGoalMinutes", 1, 1440, true);
        if (!daily.ok)
            return { success: false, message: daily.message };
        const weekly = pickNumber(payload.weeklyGoalMinutes, "weeklyGoalMinutes", 1, 10080, true);
        if (!weekly.ok)
            return { success: false, message: weekly.message };
        return { success: true, data: { dailyGoalMinutes: daily.value, weeklyGoalMinutes: weekly.value } };
    }
    if (type === "childControls") {
        const daily = pickNumber(payload.dailyLimitMinutes, "dailyLimitMinutes", 1, 600, true);
        if (!daily.ok)
            return { success: false, message: daily.message };
        if (payload.parentPin !== undefined && (typeof payload.parentPin !== "string" || payload.parentPin.trim().length < 4)) {
            return { success: false, message: "parentPin must be at least 4 characters" };
        }
        return {
            success: true,
            data: {
                parentPin: typeof payload.parentPin === "string" ? payload.parentPin.trim() : undefined,
                dailyLimitMinutes: daily.value,
                rewardPointsEnabled: Boolean(payload.rewardPointsEnabled),
                allowedSubjects: Array.isArray(payload.allowedSubjects)
                    ? payload.allowedSubjects.map((s) => String(s).trim()).filter(Boolean)
                    : [],
            },
        };
    }
    if (type === "note" || type === "notePatch") {
        const required = type === "note";
        const fields = ["summary", "difficultPoints", "nextAction"];
        const data = {};
        for (const field of fields) {
            const value = payload[field];
            if (required && typeof value !== "string")
                return { success: false, message: `${field} is required` };
            if (value !== undefined)
                data[field] = String(value).trim();
        }
        if (payload.important !== undefined)
            data.important = Boolean(payload.important);
        if (!required && Object.keys(data).length === 0)
            return { success: false, message: "No note fields provided" };
        return { success: true, data };
    }
    return { success: false, message: "Unsupported validation type" };
}
// Backward-compatible helpers used by legacy tests/routes.
function validateCreateLearningSession(body) {
    const normalized = body && typeof body === "object"
        ? {
            ...body,
            studyDate: body.studyDate ?? body.date,
            learnerMode: body.learnerMode ?? "self_learner",
        }
        : body;
    return validateLearningRequest("createSession", normalized);
}
function validateUpdateLearningSession(body) {
    const normalized = body && typeof body === "object" && body.date && !body.studyDate
        ? { ...body, studyDate: body.date }
        : body;
    return validateLearningRequest("updateSession", normalized);
}
function validateLearningSessionListQuery(query) {
    const normalized = {
        ...query,
        fromDate: query.startDate ?? query.fromDate,
        toDate: query.endDate ?? query.toDate,
    };
    return validateLearningRequest("listSessions", normalized);
}
