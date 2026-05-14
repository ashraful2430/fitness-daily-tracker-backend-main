import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  cancelLearningSession,
  completeLearningSession,
  createLearningSession,
  getLearningChildControls,
  getLearningGoals,
  getLearningSession,
  getLearningSessionNotes,
  getLearningSessions,
  getLearningStats,
  getLearningTemplates,
  getLearningTimerPresets,
  patchLearningNote,
  patchLearningSession,
  patchLearningTimerPreset,
  pauseLearningSession,
  postLearningSessionNote,
  postLearningTemplate,
  postLearningTimerPreset,
  putLearningChildControls,
  putLearningGoals,
  removeLearningNote,
  removeLearningSession,
  removeLearningTimerPreset,
  rescheduleLearningSession,
  resumeLearningSession,
  startLearningSession,
} from "../controllers/learningController";

const router = express.Router();

router.use(authMiddleware);

router.get("/sessions", getLearningSessions);
router.post("/sessions", createLearningSession);
router.get("/sessions/:id", getLearningSession);
router.patch("/sessions/:id", patchLearningSession);
router.delete("/sessions/:id", removeLearningSession);
router.post("/sessions/:id/start", startLearningSession);
router.post("/sessions/:id/pause", pauseLearningSession);
router.post("/sessions/:id/resume", resumeLearningSession);
router.post("/sessions/:id/complete", completeLearningSession);
router.post("/sessions/:id/cancel", cancelLearningSession);
router.post("/sessions/:id/reschedule", rescheduleLearningSession);

router.get("/timer-presets", getLearningTimerPresets);
router.post("/timer-presets", postLearningTimerPreset);
router.patch("/timer-presets/:id", patchLearningTimerPreset);
router.delete("/timer-presets/:id", removeLearningTimerPreset);

router.get("/templates", getLearningTemplates);
router.post("/templates", postLearningTemplate);

router.get("/goals", getLearningGoals);
router.put("/goals", putLearningGoals);

router.get("/stats", getLearningStats);

router.get("/child-controls", getLearningChildControls);
router.put("/child-controls", putLearningChildControls);

router.get("/sessions/:id/notes", getLearningSessionNotes);
router.post("/sessions/:id/notes", postLearningSessionNote);
router.patch("/notes/:noteId", patchLearningNote);
router.delete("/notes/:noteId", removeLearningNote);

// Legacy compatibility
router.post("/session", createLearningSession);
router.patch("/session/:id", patchLearningSession);
router.delete("/session/:id", removeLearningSession);
router.get("/summary", getLearningStats);

export default router;
