"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dashboardController_1 = require("../controllers/dashboardController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get("/", authMiddleware_1.authMiddleware, dashboardController_1.getDashboardData);
router.post("/water", authMiddleware_1.authMiddleware, dashboardController_1.updateWaterIntake);
router.post("/focus", authMiddleware_1.authMiddleware, dashboardController_1.logFocusSession);
router.post("/weekly-goal", authMiddleware_1.authMiddleware, dashboardController_1.updateWeeklyGoal);
// Route to fetch weekly stats
router.get("/weekly-stats", authMiddleware_1.authMiddleware, dashboardController_1.getWeeklyStats);
router.get("/monthly-overview", authMiddleware_1.authMiddleware, dashboardController_1.getMonthlyOverview);
router.get("/monthly-history", authMiddleware_1.authMiddleware, dashboardController_1.getMonthlyHistory);
// Route to update weekly stats
router.post("/weekly-stats", authMiddleware_1.authMiddleware, dashboardController_1.updateWeeklyStats);
exports.default = router;
