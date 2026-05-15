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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelFitnessWorkout = exports.skipFitnessWorkout = exports.completeFitnessWorkout = exports.startFitnessWorkout = void 0;
exports.listFitnessWorkouts = listFitnessWorkouts;
exports.createFitnessWorkout = createFitnessWorkout;
exports.getFitnessWorkout = getFitnessWorkout;
exports.updateFitnessWorkout = updateFitnessWorkout;
exports.deleteFitnessWorkout = deleteFitnessWorkout;
exports.getFitnessGoals = getFitnessGoals;
exports.putFitnessGoals = putFitnessGoals;
exports.listWorkoutTemplates = listWorkoutTemplates;
exports.createWorkoutTemplate = createWorkoutTemplate;
exports.updateWorkoutTemplate = updateWorkoutTemplate;
exports.deleteWorkoutTemplate = deleteWorkoutTemplate;
exports.listRecoveryChecks = listRecoveryChecks;
exports.createRecoveryCheck = createRecoveryCheck;
exports.updateRecoveryCheck = updateRecoveryCheck;
exports.deleteRecoveryCheck = deleteRecoveryCheck;
exports.getFitnessStats = getFitnessStats;
exports.getPersonalRecords = getPersonalRecords;
exports.recalculatePersonalRecords = recalculatePersonalRecords;
const mongoose_1 = __importDefault(require("mongoose"));
const fitnessService = __importStar(require("../services/fitnessService"));
function ok(res, data, status = 200, message = "Operation successful", meta) {
    return res.status(status).json({
        success: true,
        message,
        data,
        ...(meta ? { meta } : {}),
    });
}
function fail(res, status, message, errors = []) {
    return res.status(status).json({ success: false, message, errors });
}
function requireUser(req, res) {
    if (!req.userId) {
        fail(res, 401, "Unauthorized");
        return null;
    }
    return req.userId;
}
function validateId(id, res) {
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        fail(res, 400, "Invalid id", [{ field: "id", message: "Invalid id" }]);
        return false;
    }
    return true;
}
function param(value) {
    return Array.isArray(value) ? value[0] : value;
}
function toNumber(value) {
    if (value === undefined)
        return undefined;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
}
async function listFitnessWorkouts(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        const result = await fitnessService.listWorkouts(userId, {
            status: req.query.status,
            workoutType: req.query.workoutType,
            goalType: req.query.goalType,
            intensity: req.query.intensity,
            bodyPart: req.query.bodyPart,
            workoutDate: req.query.workoutDate,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
            search: req.query.search,
            page: toNumber(req.query.page),
            limit: toNumber(req.query.limit),
        });
        return ok(res, result.data, 200, "Operation successful", result.meta);
    }
    catch {
        return fail(res, 500, "Failed to load workouts");
    }
}
async function createFitnessWorkout(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        const workout = await fitnessService.createWorkout(userId, req.body);
        return ok(res, workout, 201);
    }
    catch (err) {
        console.error("[fitness.workouts.create]", err);
        const message = err instanceof Error && process.env.NODE_ENV !== "production"
            ? err.message
            : "Failed to create workout";
        return fail(res, 500, message);
    }
}
async function getFitnessWorkout(req, res) {
    try {
        const userId = requireUser(req, res);
        const id = param(req.params.id);
        if (!userId || !validateId(id, res))
            return;
        const workout = await fitnessService.getWorkout(userId, id);
        if (!workout)
            return fail(res, 404, "Workout not found");
        return ok(res, workout);
    }
    catch {
        return fail(res, 500, "Failed to load workout");
    }
}
async function updateFitnessWorkout(req, res) {
    try {
        const userId = requireUser(req, res);
        const id = param(req.params.id);
        if (!userId || !validateId(id, res))
            return;
        const workout = await fitnessService.updateWorkout(userId, id, req.body);
        if (!workout)
            return fail(res, 404, "Workout not found");
        return ok(res, workout);
    }
    catch {
        return fail(res, 500, "Failed to update workout");
    }
}
async function deleteFitnessWorkout(req, res) {
    try {
        const userId = requireUser(req, res);
        const id = param(req.params.id);
        if (!userId || !validateId(id, res))
            return;
        const workout = await fitnessService.deleteWorkout(userId, id);
        if (!workout)
            return fail(res, 404, "Workout not found");
        return ok(res, { id });
    }
    catch {
        return fail(res, 500, "Failed to delete workout");
    }
}
async function setStatus(req, res, status) {
    try {
        const userId = requireUser(req, res);
        const id = param(req.params.id);
        if (!userId || !validateId(id, res))
            return;
        const workout = await fitnessService.setWorkoutStatus(userId, id, status);
        if (!workout)
            return fail(res, 404, "Workout not found");
        return ok(res, workout);
    }
    catch {
        return fail(res, 500, `Failed to mark workout ${status}`);
    }
}
const startFitnessWorkout = (req, res) => setStatus(req, res, "active");
exports.startFitnessWorkout = startFitnessWorkout;
const completeFitnessWorkout = (req, res) => setStatus(req, res, "completed");
exports.completeFitnessWorkout = completeFitnessWorkout;
const skipFitnessWorkout = (req, res) => setStatus(req, res, "skipped");
exports.skipFitnessWorkout = skipFitnessWorkout;
const cancelFitnessWorkout = (req, res) => setStatus(req, res, "cancelled");
exports.cancelFitnessWorkout = cancelFitnessWorkout;
async function getFitnessGoals(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        return ok(res, await fitnessService.getFitnessGoal(userId));
    }
    catch {
        return fail(res, 500, "Failed to load fitness goals");
    }
}
async function putFitnessGoals(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        return ok(res, await fitnessService.upsertFitnessGoal(userId, req.body));
    }
    catch {
        return fail(res, 500, "Failed to save fitness goals");
    }
}
async function listWorkoutTemplates(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        return ok(res, await fitnessService.listWorkoutTemplates(userId));
    }
    catch {
        return fail(res, 500, "Failed to load workout templates");
    }
}
async function createWorkoutTemplate(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        return ok(res, await fitnessService.createWorkoutTemplate(userId, req.body), 201);
    }
    catch {
        return fail(res, 500, "Failed to create workout template");
    }
}
async function updateWorkoutTemplate(req, res) {
    try {
        const userId = requireUser(req, res);
        const id = param(req.params.id);
        if (!userId || !validateId(id, res))
            return;
        const template = await fitnessService.updateWorkoutTemplate(userId, id, req.body);
        if (!template)
            return fail(res, 404, "Workout template not found or cannot be changed");
        return ok(res, template);
    }
    catch {
        return fail(res, 500, "Failed to update workout template");
    }
}
async function deleteWorkoutTemplate(req, res) {
    try {
        const userId = requireUser(req, res);
        const id = param(req.params.id);
        if (!userId || !validateId(id, res))
            return;
        const template = await fitnessService.deleteWorkoutTemplate(userId, id);
        if (!template)
            return fail(res, 404, "Workout template not found or cannot be deleted");
        return ok(res, { id });
    }
    catch {
        return fail(res, 500, "Failed to delete workout template");
    }
}
async function listRecoveryChecks(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        const result = await fitnessService.listRecoveryChecks(userId, {
            checkDate: req.query.checkDate,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
            page: toNumber(req.query.page),
            limit: toNumber(req.query.limit),
        });
        return ok(res, result.data, 200, "Operation successful", result.meta);
    }
    catch {
        return fail(res, 500, "Failed to load recovery checks");
    }
}
async function createRecoveryCheck(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        return ok(res, await fitnessService.createRecoveryCheck(userId, req.body), 201);
    }
    catch {
        return fail(res, 500, "Failed to save recovery check");
    }
}
async function updateRecoveryCheck(req, res) {
    try {
        const userId = requireUser(req, res);
        const id = param(req.params.id);
        if (!userId || !validateId(id, res))
            return;
        const recovery = await fitnessService.updateRecoveryCheck(userId, id, req.body);
        if (!recovery)
            return fail(res, 404, "Recovery check not found");
        return ok(res, recovery);
    }
    catch {
        return fail(res, 500, "Failed to update recovery check");
    }
}
async function deleteRecoveryCheck(req, res) {
    try {
        const userId = requireUser(req, res);
        const id = param(req.params.id);
        if (!userId || !validateId(id, res))
            return;
        const recovery = await fitnessService.deleteRecoveryCheck(userId, id);
        if (!recovery)
            return fail(res, 404, "Recovery check not found");
        return ok(res, { id });
    }
    catch {
        return fail(res, 500, "Failed to delete recovery check");
    }
}
async function getFitnessStats(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        return ok(res, await fitnessService.getFitnessStats(userId));
    }
    catch {
        return fail(res, 500, "Failed to load fitness stats");
    }
}
async function getPersonalRecords(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        return ok(res, await fitnessService.getPersonalRecords(userId));
    }
    catch {
        return fail(res, 500, "Failed to load personal records");
    }
}
async function recalculatePersonalRecords(req, res) {
    try {
        const userId = requireUser(req, res);
        if (!userId)
            return;
        return ok(res, await fitnessService.recalculatePersonalRecords(userId));
    }
    catch {
        return fail(res, 500, "Failed to recalculate personal records");
    }
}
