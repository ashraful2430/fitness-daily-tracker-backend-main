import { NextFunction, Response } from "express";
import {
  BODY_PARTS,
  ENERGY_LEVELS,
  FITNESS_GOAL_TYPES,
  SLEEP_QUALITIES,
  SORENESS_LEVELS,
  WORKOUT_INTENSITIES,
  WORKOUT_MOODS,
  WORKOUT_STATUSES,
  WORKOUT_TYPES,
} from "../constants/fitness";
import { AuthRequest } from "./authMiddleware";

type ValidationResult =
  | { ok: true }
  | { ok: false; message: string; field?: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidDate(value: unknown) {
  return typeof value === "string" || value instanceof Date
    ? !Number.isNaN(new Date(value).getTime())
    : false;
}

function validateEnum(
  body: Record<string, unknown>,
  field: string,
  values: readonly string[],
  required = false,
): ValidationResult {
  if (body[field] === undefined || body[field] === null || body[field] === "") {
    return required ? { ok: false, message: `${field} is required`, field } : { ok: true };
  }
  return typeof body[field] === "string" && values.includes(body[field] as string)
    ? { ok: true }
    : { ok: false, message: `${field} must be one of: ${values.join(", ")}`, field };
}

function validateNumberRange(
  body: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
  required = false,
): ValidationResult {
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

function firstError(results: ValidationResult[]) {
  return results.find((result) => !result.ok) as
    | { ok: false; message: string; field?: string }
    | undefined;
}

export function validateWorkoutPayload(required: boolean) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
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
      validateEnum(body, "workoutType", WORKOUT_TYPES, required),
      validateEnum(body, "goalType", FITNESS_GOAL_TYPES, false),
      validateNumberRange(body, "durationMinutes", 1, 600, required),
      validateNumberRange(body, "calories", 0, Number.MAX_SAFE_INTEGER, false),
      validateEnum(body, "intensity", WORKOUT_INTENSITIES, false),
      validateEnum(body, "bodyPart", BODY_PARTS, false),
      validateNumberRange(body, "sets", 0, Number.MAX_SAFE_INTEGER, false),
      validateNumberRange(body, "reps", 0, Number.MAX_SAFE_INTEGER, false),
      validateNumberRange(body, "weight", 0, Number.MAX_SAFE_INTEGER, false),
      validateNumberRange(body, "distance", 0, Number.MAX_SAFE_INTEGER, false),
      validateNumberRange(body, "steps", 0, Number.MAX_SAFE_INTEGER, false),
      validateEnum(body, "moodAfter", WORKOUT_MOODS, false),
      validateEnum(body, "status", WORKOUT_STATUSES, false),
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

export function validateGoalPayload(req: AuthRequest, res: Response, next: NextFunction) {
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

export const validateTemplatePayload = validateWorkoutPayload;

export function validateRecoveryPayload(required: boolean) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
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
      validateEnum(req.body, "sleepQuality", SLEEP_QUALITIES, required),
      validateEnum(req.body, "energyLevel", ENERGY_LEVELS, required),
      validateEnum(req.body, "sorenessLevel", SORENESS_LEVELS, required),
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
