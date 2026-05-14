import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  cancelSession,
  completeSession,
  createSession,
  createSessionNote,
  createTemplate,
  createTimerPreset,
  deleteNote,
  deleteSession,
  deleteTimerPreset,
  getChildControls,
  getGoals,
  getSessionById,
  getStats,
  getTemplates,
  getTimerPresets,
  listSessionNotes,
  listSessions,
  pauseSession,
  rescheduleSession,
  resumeSession,
  startSession,
  updateNote,
  updateSession,
  updateTimerPreset,
  upsertChildControls,
  upsertGoals,
} from "../services/learningService";
import { validateLearningRequest } from "../validation/learningValidation";

function unauthorized(res: Response) {
  return res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
}

function ok(res: Response, data: unknown, message = "Operation successful") {
  return res.status(200).json({ success: true, message, data });
}

function badRequest(res: Response, message: string) {
  return res.status(400).json({ success: false, message, errors: [] });
}

function notFound(res: Response, message = "Resource not found") {
  return res.status(404).json({ success: false, message, errors: [] });
}

function userId(req: AuthRequest) {
  return req.userId;
}

function routeId(req: AuthRequest, key: string) {
  const value = (req.params as Record<string, string | undefined>)[key];
  return typeof value === "string" ? value : "";
}

export async function getLearningSessions(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const validation = validateLearningRequest("listSessions", req.query);
  if (!validation.success) return badRequest(res, validation.message);
  const result = await listSessions(uid, validation.data);
  return ok(res, { items: result.rows, pagination: result.pagination });
}

export async function createLearningSession(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const validation = validateLearningRequest("createSession", req.body);
  if (!validation.success) return badRequest(res, validation.message);
  const row = await createSession(uid, validation.data);
  return res.status(201).json({ success: true, message: "Operation successful", data: row });
}

export async function getLearningSession(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const id = routeId(req, "id");
  const row = await getSessionById(uid, id);
  if (!row) return notFound(res, "Learning session not found");
  return ok(res, row);
}

export async function patchLearningSession(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const id = routeId(req, "id");
  const validation = validateLearningRequest("updateSession", req.body);
  if (!validation.success) return badRequest(res, validation.message);
  const row = await updateSession(uid, id, validation.data);
  if (!row) return notFound(res, "Learning session not found");
  return ok(res, row);
}

export async function removeLearningSession(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const id = routeId(req, "id");
  const row = await deleteSession(uid, id);
  if (!row) return notFound(res, "Learning session not found");
  return ok(res, { deleted: true });
}

export async function startLearningSession(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const row = await startSession(uid, routeId(req, "id"));
  if (!row) return notFound(res, "Learning session not found");
  return ok(res, row);
}

export async function pauseLearningSession(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const row = await pauseSession(uid, routeId(req, "id"));
  if (!row) return notFound(res, "Learning session not found");
  return ok(res, row);
}

export async function resumeLearningSession(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const row = await resumeSession(uid, routeId(req, "id"));
  if (!row) return notFound(res, "Learning session not found");
  return ok(res, row);
}

export async function completeLearningSession(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const actualMinutes = typeof req.body?.actualMinutes === "number" ? req.body.actualMinutes : undefined;
  if (actualMinutes !== undefined && actualMinutes < 0) return badRequest(res, "actualMinutes must be 0 or more");
  const row = await completeSession(uid, routeId(req, "id"), actualMinutes);
  if (!row) return notFound(res, "Learning session not found");
  return ok(res, row);
}

export async function cancelLearningSession(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const row = await cancelSession(uid, routeId(req, "id"));
  if (!row) return notFound(res, "Learning session not found");
  return ok(res, row);
}

export async function rescheduleLearningSession(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const validation = validateLearningRequest("rescheduleSession", req.body);
  if (!validation.success) return badRequest(res, validation.message);
  const row = await rescheduleSession(uid, routeId(req, "id"), validation.data.studyDate);
  if (!row) return notFound(res, "Learning session not found");
  return ok(res, row);
}

export async function getLearningTimerPresets(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const rows = await getTimerPresets(uid);
  return ok(res, rows);
}

export async function postLearningTimerPreset(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const validation = validateLearningRequest("timerPreset", req.body);
  if (!validation.success) return badRequest(res, validation.message);
  const row = await createTimerPreset(uid, validation.data.label, validation.data.minutes);
  return res.status(201).json({ success: true, message: "Operation successful", data: row });
}

export async function patchLearningTimerPreset(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const validation = validateLearningRequest("timerPresetPatch", req.body);
  if (!validation.success) return badRequest(res, validation.message);
  const row = await updateTimerPreset(uid, routeId(req, "id"), validation.data);
  if (!row) return badRequest(res, "Preset not found or default preset cannot be edited");
  return ok(res, row);
}

export async function removeLearningTimerPreset(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const row = await deleteTimerPreset(uid, routeId(req, "id"));
  if (!row) return badRequest(res, "Preset not found or default preset cannot be deleted");
  return ok(res, { deleted: true });
}

export async function getLearningTemplates(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  return ok(res, await getTemplates(uid));
}

export async function postLearningTemplate(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const validation = validateLearningRequest("template", req.body);
  if (!validation.success) return badRequest(res, validation.message);
  const row = await createTemplate(uid, validation.data);
  return res.status(201).json({ success: true, message: "Operation successful", data: row });
}

export async function getLearningGoals(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  return ok(res, await getGoals(uid));
}

export async function putLearningGoals(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const validation = validateLearningRequest("goals", req.body);
  if (!validation.success) return badRequest(res, validation.message);
  return ok(res, await upsertGoals(uid, validation.data));
}

export async function getLearningStats(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  return ok(res, await getStats(uid));
}

export async function getLearningChildControls(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  return ok(res, (await getChildControls(uid)) ?? null);
}

export async function putLearningChildControls(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const validation = validateLearningRequest("childControls", req.body);
  if (!validation.success) return badRequest(res, validation.message);
  return ok(res, await upsertChildControls(uid, validation.data));
}

export async function getLearningSessionNotes(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  return ok(res, await listSessionNotes(uid, routeId(req, "id")));
}

export async function postLearningSessionNote(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const validation = validateLearningRequest("note", req.body);
  if (!validation.success) return badRequest(res, validation.message);
  const row = await createSessionNote(uid, routeId(req, "id"), validation.data);
  if (!row) return notFound(res, "Learning session not found");
  return res.status(201).json({ success: true, message: "Operation successful", data: row });
}

export async function patchLearningNote(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const validation = validateLearningRequest("notePatch", req.body);
  if (!validation.success) return badRequest(res, validation.message);
  const row = await updateNote(uid, routeId(req, "noteId"), validation.data);
  if (!row) return notFound(res, "Learning note not found");
  return ok(res, row);
}

export async function removeLearningNote(req: AuthRequest, res: Response) {
  const uid = userId(req);
  if (!uid) return unauthorized(res);
  const row = await deleteNote(uid, routeId(req, "noteId"));
  if (!row) return notFound(res, "Learning note not found");
  return ok(res, { deleted: true });
}
