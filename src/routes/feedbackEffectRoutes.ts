import express from "express";
import { getFeedbackEffects } from "../controllers/feedbackEffectController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", authMiddleware, getFeedbackEffects);

export default router;
