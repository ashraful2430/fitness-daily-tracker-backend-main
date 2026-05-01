"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const workoutController_1 = require("../controllers/workoutController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get("/", authMiddleware_1.authMiddleware, workoutController_1.getWorkouts);
router.post("/", authMiddleware_1.authMiddleware, workoutController_1.createWorkout);
router.patch("/:id", authMiddleware_1.authMiddleware, workoutController_1.updateWorkout);
router.delete("/:id", authMiddleware_1.authMiddleware, workoutController_1.deleteWorkout);
exports.default = router;
