import express from "express";
import {
  getSections,
  createSection,
  updateSection,
  deleteSection,
  updateProgress,
} from "../controllers/scoreSectionController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", authMiddleware, getSections);
router.post("/", authMiddleware, createSection);
router.patch("/:id", authMiddleware, updateSection);
router.delete("/:id", authMiddleware, deleteSection);
router.patch("/:id/progress", authMiddleware, updateProgress);

export default router;
