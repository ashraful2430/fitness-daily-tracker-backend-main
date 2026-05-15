"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTemplatePayload = void 0;
exports.validateWorkoutPayload = validateWorkoutPayload;
exports.validateGoalPayload = validateGoalPayload;
exports.validateRecoveryPayload = validateRecoveryPayload;
const fitness_1 = require("../constants/fitness");
function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isValidDate(value) {
    return typeof value === "string" || value instanceof Date
        ? !Number.isNaN(new Date(value).getTime())
        : false;
}
function validateEnum(body, field, values, required = false) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
        return required ? { ok: false, message: `${field} is required`, field } : { ok: true };
    }
    return typeof body[field] === "string" && values.includes(body[field])
        ? { ok: true }
        : { ok: false, message: `${field} must be one of: ${values.join(", ")}`, field };
}
function validateNumberRange(body, field, min, max, required = false) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
        return required ? { ok: false, message: `${field} is required`, field } : { ok: true };
    }
    return typeof body[field] === "number" &&
        Number.isFinite(body[field]) &&
        body[field] >= min &&
        body[field] <= max
        ? { ok: true }
        : {
            ok: false,
            message: `${field} must be between ${min} and ${max}`,
            field,
        };
}
function firstError(results) {
    return results.find((result) => !result.ok);
}
function validateWorkoutPayload(required) {
    return (req, res, next) => {
        if (!isObject(req.body)) {
            return res.status(400).json({
                success: false,
                message: "Request body must be an object",
                errors: [],
            });
        }
        const body = req.body;
        if (required && (typeof body.title !== "string" || !body.title.trim())) {
            return res.status(400).json({
                success: false,
                message: "title is required",
                errors: [{ field: "title", message: "title is required" }],
            });
        }
        if (body.workoutDate !== undefined && !isValidDate(body.workoutDate)) {
            return res.status(400).json({
                success: false,
                message: "workoutDate must be a valid date",
                errors: [{ field: "workoutDate", message: "workoutDate must be a valid date" }],
            });
        }
        const error = firstError([
            validateEnum(body, "workoutType", fitness_1.WORKOUT_TYPES, required),
            validateEnum(body, "goalType", fitness_1.FITNESS_GOAL_TYPES, false),
            validateNumberRange(body, "durationMinutes", 1, 600, required),
            validateNumberRange(body, "calories", 0, Number.MAX_SAFE_INTEGER, false),
            validateEnum(body, "intensity", fitness_1.WORKOUT_INTENSITIES, false),
            validateEnum(body, "bodyPart", fitness_1.BODY_PARTS, false),
            validateNumberRange(body, "sets", 0, Number.MAX_SAFE_INTEGER, false),
            validateNumberRange(body, "reps", 0, Number.MAX_SAFE_INTEGER, false),
            validateNumberRange(body, "weight", 0, Number.MAX_SAFE_INTEGER, false),
            validateNumberRange(body, "distance", 0, Number.MAX_SAFE_INTEGER, false),
            validateNumberRange(body, "steps", 0, Number.MAX_SAFE_INTEGER, false),
            validateEnum(body, "moodAfter", fitness_1.WORKOUT_MOODS, false),
            validateEnum(body, "status", fitness_1.WORKOUT_STATUSES, false),
        ]);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
                errors: [{ field: error.field, message: error.message }],
            });
        }
        next();
    };
}
function validateGoalPayload(req, res, next) {
    if (!isObject(req.body)) {
        return res.status(400).json({ success: false, message: "Request body must be an object", errors: [] });
    }
    const error = firstError([
        validateNumberRange(req.body, "weeklyWorkoutTarget", 1, 30, true),
        validateNumberRange(req.body, "weeklyActiveMinutesTarget", 1, 5000, true),
        validateNumberRange(req.body, "weeklyCaloriesTarget", 0, 50000, true),
        validateNumberRange(req.body, "dailyStepsTarget", 0, 100000, true),
    ]);
    if (error) {
        return res.status(400).json({ success: false, message: error.message, errors: [{ field: error.field, message: error.message }] });
    }
    next();
}
exports.validateTemplatePayload = validateWorkoutPayload;
function validateRecoveryPayload(required) {
    return (req, res, next) => {
        if (!isObject(req.body)) {
            return res.status(400).json({ success: false, message: "Request body must be an object", errors: [] });
        }
        if ((required || req.body.checkDate !== undefined) && !isValidDate(req.body.checkDate)) {
            return res.status(400).json({
                success: false,
                message: "checkDate must be a valid date",
                errors: [{ field: "checkDate", message: "checkDate must be a valid date" }],
            });
        }
        const error = firstError([
            validateEnum(req.body, "sleepQuality", fitness_1.SLEEP_QUALITIES, required),
            validateEnum(req.body, "energyLevel", fitness_1.ENERGY_LEVELS, required),
            validateEnum(req.body, "sorenessLevel", fitness_1.SORENESS_LEVELS, required),
            validateNumberRange(req.body, "waterGlasses", 0, 30, false),
        ]);
        if (error) {
            return res.status(400).json({ success: false, message: error.message, errors: [{ field: error.field, message: error.message }] });
        }
        if (req.body.isRestDay !== undefined && typeof req.body.isRestDay !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isRestDay must be boolean",
                errors: [{ field: "isRestDay", message: "isRestDay must be boolean" }],
            });
        }
        next();
    };
}
