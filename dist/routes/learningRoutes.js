"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const learningController_1 = require("../controllers/learningController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.authMiddleware);
router.post("/session", learningController_1.createLearningSession);
router.patch("/session/:id", learningController_1.updateLearningSession);
router.delete("/session/:id", learningController_1.deleteLearningSession);
router.get("/sessions", learningController_1.getLearningSessions);
router.get("/summary", learningController_1.getLearningSummary);
exports.default = router;
