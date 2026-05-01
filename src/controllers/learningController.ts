import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  createLearningSession as createLearningSessionService,
  deleteLearningSession as deleteLearningSessionService,
  getLearningSummary as getLearningSummaryService,
  listLearningSessions as listLearningSessionsService,
  updateLearningSession as updateLearningSessionService,
} from "../services/learningService";
import {
  validateCreateLearningSession,
  validateLearningSessionListQuery,
  validateUpdateLearningSession,
} from "../validation/learningValidation";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Server error";
}

function getUserId(req: AuthRequest) {
  return req.userId;
}

function getRouteId(req: AuthRequest) {
  return typeof req.params.id === "string" ? req.params.id : "";
}

export async function createLearningSession(req: AuthRequest, res: Response) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const validation = validateCreateLearningSession(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  try {
    const result = await createLearningSessionService(userId, validation.data);

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
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function updateLearningSession(req: AuthRequest, res: Response) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const validation = validateUpdateLearningSession(req.body);
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
    const result = await updateLearningSessionService(
      userId,
      sessionId,
      validation.data,
    );

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
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function deleteLearningSession(req: AuthRequest, res: Response) {
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
    const result = await deleteLearningSessionService(userId, sessionId);

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
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function getLearningSessions(req: AuthRequest, res: Response) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const validation = validateLearningSessionListQuery(
    req.query as Record<string, unknown>,
  );
  if (!validation.success) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  try {
    const result = await listLearningSessionsService(userId, validation.data);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function getLearningSummary(req: AuthRequest, res: Response) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const result = await getLearningSummaryService(userId);

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}
