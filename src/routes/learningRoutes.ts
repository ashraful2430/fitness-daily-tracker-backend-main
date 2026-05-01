import express from "express";
import {
  createLearningSession,
  deleteLearningSession,
  getLearningSessions,
  getLearningSummary,
  updateLearningSession,
} from "../controllers/learningController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

router.post("/session", createLearningSession);
router.patch("/session/:id", updateLearningSession);
router.delete("/session/:id", deleteLearningSession);
router.get("/sessions", getLearningSessions);
router.get("/summary", getLearningSummary);

export default router;
