"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scoreSectionController_1 = require("../controllers/scoreSectionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get("/", authMiddleware_1.authMiddleware, scoreSectionController_1.getSections);
router.post("/", authMiddleware_1.authMiddleware, scoreSectionController_1.createSection);
router.patch("/:id", authMiddleware_1.authMiddleware, scoreSectionController_1.updateSection);
router.delete("/:id", authMiddleware_1.authMiddleware, scoreSectionController_1.deleteSection);
router.patch("/:id/progress", authMiddleware_1.authMiddleware, scoreSectionController_1.updateProgress);
exports.default = router;
