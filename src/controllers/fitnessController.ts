import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import * as fitnessService from "../services/fitnessService";

function ok(res: Response, data: unknown, status = 200, message = "Operation successful", meta?: unknown) {
  return res.status(status).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

function fail(res: Response, status: number, message: string, errors: unknown[] = []) {
  return res.status(status).json({ success: false, message, errors });
}

function requireUser(req: AuthRequest, res: Response) {
  if (!req.userId) {
    fail(res, 401, "Unauthorized");
    return null;
  }
  return req.userId;
}

function validateId(id: string | undefined, res: Response) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    fail(res, 400, "Invalid id", [{ field: "id", message: "Invalid id" }]);
    return false;
  }
  return true;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: unknown) {
  if (value === undefined) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export async function listFitnessWorkouts(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const result = await fitnessService.listWorkouts(userId, {
      status: req.query.status as string | undefined,
      workoutType: req.query.workoutType as string | undefined,
      goalType: req.query.goalType as string | undefined,
      intensity: req.query.intensity as string | undefined,
      bodyPart: req.query.bodyPart as string | undefined,
      workoutDate: req.query.workoutDate as string | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      search: req.query.search as string | undefined,
      page: toNumber(req.query.page),
      limit: toNumber(req.query.limit),
    });
    return ok(res, result.data, 200, "Operation successful", result.meta);
  } catch {
    return fail(res, 500, "Failed to load workouts");
  }
}

export async function createFitnessWorkout(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const workout = await fitnessService.createWorkout(userId, req.body);
    return ok(res, workout, 201);
  } catch (err) {
    console.error("[fitness.workouts.create]", err);
    const message =
      err instanceof Error && process.env.NODE_ENV !== "production"
        ? err.message
        : "Failed to create workout";
    return fail(res, 500, message);
  }
}

export async function getFitnessWorkout(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    const id = param(req.params.id);
    if (!userId || !validateId(id, res)) return;
    const workout = await fitnessService.getWorkout(userId, id as string);
    if (!workout) return fail(res, 404, "Workout not found");
    return ok(res, workout);
  } catch {
    return fail(res, 500, "Failed to load workout");
  }
}

export async function updateFitnessWorkout(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    const id = param(req.params.id);
    if (!userId || !validateId(id, res)) return;
    const workout = await fitnessService.updateWorkout(userId, id as string, req.body);
    if (!workout) return fail(res, 404, "Workout not found");
    return ok(res, workout);
  } catch {
    return fail(res, 500, "Failed to update workout");
  }
}

export async function deleteFitnessWorkout(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    const id = param(req.params.id);
    if (!userId || !validateId(id, res)) return;
    const workout = await fitnessService.deleteWorkout(userId, id as string);
    if (!workout) return fail(res, 404, "Workout not found");
    return ok(res, { id });
  } catch {
    return fail(res, 500, "Failed to delete workout");
  }
}

async function setStatus(req: AuthRequest, res: Response, status: "active" | "completed" | "skipped" | "cancelled") {
  try {
    const userId = requireUser(req, res);
    const id = param(req.params.id);
    if (!userId || !validateId(id, res)) return;
    const workout = await fitnessService.setWorkoutStatus(userId, id as string, status);
    if (!workout) return fail(res, 404, "Workout not found");
    return ok(res, workout);
  } catch {
    return fail(res, 500, `Failed to mark workout ${status}`);
  }
}

export const startFitnessWorkout = (req: AuthRequest, res: Response) => setStatus(req, res, "active");
export const completeFitnessWorkout = (req: AuthRequest, res: Response) => setStatus(req, res, "completed");
export const skipFitnessWorkout = (req: AuthRequest, res: Response) => setStatus(req, res, "skipped");
export const cancelFitnessWorkout = (req: AuthRequest, res: Response) => setStatus(req, res, "cancelled");

export async function getFitnessGoals(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    return ok(res, await fitnessService.getFitnessGoal(userId));
  } catch {
    return fail(res, 500, "Failed to load fitness goals");
  }
}

export async function putFitnessGoals(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    return ok(res, await fitnessService.upsertFitnessGoal(userId, req.body));
  } catch {
    return fail(res, 500, "Failed to save fitness goals");
  }
}

export async function listWorkoutTemplates(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    return ok(res, await fitnessService.listWorkoutTemplates(userId));
  } catch {
    return fail(res, 500, "Failed to load workout templates");
  }
}

export async function createWorkoutTemplate(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    return ok(res, await fitnessService.createWorkoutTemplate(userId, req.body), 201);
  } catch {
    return fail(res, 500, "Failed to create workout template");
  }
}

export async function updateWorkoutTemplate(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    const id = param(req.params.id);
    if (!userId || !validateId(id, res)) return;
    const template = await fitnessService.updateWorkoutTemplate(userId, id as string, req.body);
    if (!template) return fail(res, 404, "Workout template not found or cannot be changed");
    return ok(res, template);
  } catch {
    return fail(res, 500, "Failed to update workout template");
  }
}

export async function deleteWorkoutTemplate(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    const id = param(req.params.id);
    if (!userId || !validateId(id, res)) return;
    const template = await fitnessService.deleteWorkoutTemplate(userId, id as string);
    if (!template) return fail(res, 404, "Workout template not found or cannot be deleted");
    return ok(res, { id });
  } catch {
    return fail(res, 500, "Failed to delete workout template");
  }
}

export async function listRecoveryChecks(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const result = await fitnessService.listRecoveryChecks(userId, {
      checkDate: req.query.checkDate as string | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      page: toNumber(req.query.page),
      limit: toNumber(req.query.limit),
    });
    return ok(res, result.data, 200, "Operation successful", result.meta);
  } catch {
    return fail(res, 500, "Failed to load recovery checks");
  }
}

export async function createRecoveryCheck(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    return ok(res, await fitnessService.createRecoveryCheck(userId, req.body), 201);
  } catch {
    return fail(res, 500, "Failed to save recovery check");
  }
}

export async function updateRecoveryCheck(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    const id = param(req.params.id);
    if (!userId || !validateId(id, res)) return;
    const recovery = await fitnessService.updateRecoveryCheck(userId, id as string, req.body);
    if (!recovery) return fail(res, 404, "Recovery check not found");
    return ok(res, recovery);
  } catch {
    return fail(res, 500, "Failed to update recovery check");
  }
}

export async function deleteRecoveryCheck(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    const id = param(req.params.id);
    if (!userId || !validateId(id, res)) return;
    const recovery = await fitnessService.deleteRecoveryCheck(userId, id as string);
    if (!recovery) return fail(res, 404, "Recovery check not found");
    return ok(res, { id });
  } catch {
    return fail(res, 500, "Failed to delete recovery check");
  }
}

export async function getFitnessStats(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    return ok(res, await fitnessService.getFitnessStats(userId));
  } catch {
    return fail(res, 500, "Failed to load fitness stats");
  }
}

export async function getPersonalRecords(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    return ok(res, await fitnessService.getPersonalRecords(userId));
  } catch {
    return fail(res, 500, "Failed to load personal records");
  }
}

export async function recalculatePersonalRecords(req: AuthRequest, res: Response) {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    return ok(res, await fitnessService.recalculatePersonalRecords(userId));
  } catch {
    return fail(res, 500, "Failed to recalculate personal records");
  }
}
