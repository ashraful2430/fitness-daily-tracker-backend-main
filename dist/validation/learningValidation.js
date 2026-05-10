"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateLearningSession = validateCreateLearningSession;
exports.validateUpdateLearningSession = validateUpdateLearningSession;
exports.validateLearningSessionListQuery = validateLearningSessionListQuery;
const LearningSession_1 = require("../models/LearningSession");
function isValidDateString(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
function parseOptionalDate(value, fieldName) {
    if (value === undefined) {
        return { ok: true, value: undefined };
    }
    if (value === null) {
        return { ok: true, value: null };
    }
    if (typeof value !== "string") {
        return {
            ok: false,
            message: `${fieldName} must be a valid ISO date string or null.`,
        };
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return {
            ok: false,
            message: `${fieldName} must be a valid ISO date string or null.`,
        };
    }
    return { ok: true, value: parsed };
}
function parsePositiveInteger(value, fieldName, minimum) {
    if (typeof value !== "number" || Number.isNaN(value) || value < minimum) {
        return {
            success: false,
            message: `${fieldName} must be a number greater than or equal to ${minimum}.`,
        };
    }
    return {
        success: true,
        data: value,
    };
}
function parseNonNegativeInteger(value, fieldName) {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
        return {
            success: false,
            message: `${fieldName} must be a number greater than or equal to 0.`,
        };
    }
    return {
        success: true,
        data: value,
    };
}
function parseStatus(value) {
    if (typeof value !== "string" ||
        !LearningSession_1.LEARNING_SESSION_STATUSES.includes(value)) {
        return {
            success: false,
            message: `status must be one of: ${LearningSession_1.LEARNING_SESSION_STATUSES.join(", ")}.`,
        };
    }
    return {
        success: true,
        data: value,
    };
}
function parseOptionalText(value, fieldName) {
    if (value === undefined || value === null) {
        return {
            success: true,
            data: undefined,
        };
    }
    if (typeof value !== "string") {
        return {
            success: false,
            message: `${fieldName} must be a string when provided.`,
        };
    }
    return {
        success: true,
        data: value.trim(),
    };
}
function validateCreateLearningSession(body) {
    if (!body || typeof body !== "object") {
        return {
            success: false,
            message: "Request body is required.",
        };
    }
    const payload = body;
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const notes = parseOptionalText(payload.notes, "notes");
    if (!notes.success) {
        return notes;
    }
    const date = typeof payload.date === "string" ? payload.date.trim() : "";
    if (!title) {
        return { success: false, message: "title is required." };
    }
    if (!subject) {
        return { success: false, message: "subject is required." };
    }
    const plannedMinutes = parsePositiveInteger(payload.plannedMinutes, "plannedMinutes", 1);
    if (!plannedMinutes.success) {
        return plannedMinutes;
    }
    if (!date || !isValidDateString(date)) {
        return {
            success: false,
            message: "date must be a valid YYYY-MM-DD string.",
        };
    }
    let actualMinutes;
    if (payload.actualMinutes !== undefined) {
        const parsed = parseNonNegativeInteger(payload.actualMinutes, "actualMinutes");
        if (!parsed.success) {
            return parsed;
        }
        actualMinutes = parsed.data;
    }
    let status;
    if (payload.status !== undefined) {
        const parsedStatus = parseStatus(payload.status);
        if (!parsedStatus.success) {
            return parsedStatus;
        }
        status = parsedStatus.data;
    }
    const startedAt = parseOptionalDate(payload.startedAt, "startedAt");
    if (!startedAt.ok) {
        return {
            success: false,
            message: startedAt.message,
        };
    }
    const completedAt = parseOptionalDate(payload.completedAt, "completedAt");
    if (!completedAt.ok) {
        return {
            success: false,
            message: completedAt.message,
        };
    }
    return {
        success: true,
        data: {
            title,
            subject,
            plannedMinutes: plannedMinutes.data,
            actualMinutes,
            status,
            notes: notes.data,
            date,
            startedAt: startedAt.value,
            completedAt: completedAt.value,
        },
    };
}
function validateUpdateLearningSession(body) {
    if (!body || typeof body !== "object") {
        return {
            success: false,
            message: "Request body is required.",
        };
    }
    const payload = body;
    const updates = {};
    if (payload.title !== undefined) {
        if (typeof payload.title !== "string" || !payload.title.trim()) {
            return { success: false, message: "title must be a non-empty string." };
        }
        updates.title = payload.title.trim();
    }
    if (payload.subject !== undefined) {
        if (typeof payload.subject !== "string" || !payload.subject.trim()) {
            return { success: false, message: "subject must be a non-empty string." };
        }
        updates.subject = payload.subject.trim();
    }
    if (payload.plannedMinutes !== undefined) {
        const parsed = parsePositiveInteger(payload.plannedMinutes, "plannedMinutes", 1);
        if (!parsed.success) {
            return parsed;
        }
        updates.plannedMinutes = parsed.data;
    }
    if (payload.actualMinutes !== undefined) {
        const parsed = parseNonNegativeInteger(payload.actualMinutes, "actualMinutes");
        if (!parsed.success) {
            return parsed;
        }
        updates.actualMinutes = parsed.data;
    }
    if (payload.status !== undefined) {
        const parsedStatus = parseStatus(payload.status);
        if (!parsedStatus.success) {
            return parsedStatus;
        }
        updates.status = parsedStatus.data;
    }
    if (payload.notes !== undefined) {
        if (payload.notes !== null && typeof payload.notes !== "string") {
            return {
                success: false,
                message: "notes must be a string when provided.",
            };
        }
        updates.notes =
            typeof payload.notes === "string" ? payload.notes.trim() : "";
    }
    if (payload.date !== undefined) {
        if (typeof payload.date !== "string" || !isValidDateString(payload.date.trim())) {
            return {
                success: false,
                message: "date must be a valid YYYY-MM-DD string.",
            };
        }
        updates.date = payload.date.trim();
    }
    const startedAt = parseOptionalDate(payload.startedAt, "startedAt");
    if (!startedAt.ok) {
        return { success: false, message: startedAt.message };
    }
    if (payload.startedAt !== undefined) {
        updates.startedAt = startedAt.value ?? null;
    }
    const completedAt = parseOptionalDate(payload.completedAt, "completedAt");
    if (!completedAt.ok) {
        return { success: false, message: completedAt.message };
    }
    if (payload.completedAt !== undefined) {
        updates.completedAt = completedAt.value ?? null;
    }
    if (Object.keys(updates).length === 0) {
        return {
            success: false,
            message: "At least one editable field must be provided.",
        };
    }
    return {
        success: true,
        data: updates,
    };
}
function validateLearningSessionListQuery(query) {
    const page = typeof query.page === "string" ? Number.parseInt(query.page, 10) : 1;
    const limit = typeof query.limit === "string" ? Number.parseInt(query.limit, 10) : 10;
    if (Number.isNaN(page) || page < 1) {
        return { success: false, message: "page must be a positive integer." };
    }
    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
        return {
            success: false,
            message: "limit must be a positive integer between 1 and 100.",
        };
    }
    let status;
    if (typeof query.status === "string" && query.status.trim()) {
        const parsedStatus = parseStatus(query.status.trim());
        if (!parsedStatus.success) {
            return parsedStatus;
        }
        status = parsedStatus.data;
    }
    const subject = typeof query.subject === "string" && query.subject.trim()
        ? query.subject.trim()
        : undefined;
    const startDate = typeof query.startDate === "string" && query.startDate.trim()
        ? query.startDate.trim()
        : undefined;
    const endDate = typeof query.endDate === "string" && query.endDate.trim()
        ? query.endDate.trim()
        : undefined;
    if (startDate && !isValidDateString(startDate)) {
        return {
            success: false,
            message: "startDate must be a valid YYYY-MM-DD string.",
        };
    }
    if (endDate && !isValidDateString(endDate)) {
        return {
            success: false,
            message: "endDate must be a valid YYYY-MM-DD string.",
        };
    }
    if (startDate && endDate && startDate > endDate) {
        return {
            success: false,
            message: "startDate cannot be later than endDate.",
        };
    }
    return {
        success: true,
        data: {
            page,
            limit,
            status,
            subject,
            startDate,
            endDate,
        },
    };
}
