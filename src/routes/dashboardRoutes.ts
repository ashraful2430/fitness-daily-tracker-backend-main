import express from "express";
import {
  getDashboardData,
  updateWaterIntake,
  logFocusSession,
  updateWeeklyGoal,
  getWeeklyStats,
  getMonthlyOverview,
  getMonthlyHistory,
  updateWeeklyStats,
} from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", authMiddleware, getDashboardData);
router.post("/water", authMiddleware, updateWaterIntake);
router.post("/focus", authMiddleware, logFocusSession);
router.post("/weekly-goal", authMiddleware, updateWeeklyGoal);
// Route to fetch weekly stats
router.get("/weekly-stats", authMiddleware, getWeeklyStats);
router.get("/monthly-overview", authMiddleware, getMonthlyOverview);
router.get("/monthly-history", authMiddleware, getMonthlyHistory);

// Route to update weekly stats
router.post("/weekly-stats", authMiddleware, updateWeeklyStats);

export default router;
