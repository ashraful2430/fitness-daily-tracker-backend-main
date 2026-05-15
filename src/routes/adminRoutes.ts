import express from "express";
import {
  getAdminUsers,
  getUserAdminSummary,
  setUserBlockStatus,
  updateUserRole,
} from "../controllers/adminController";
import {
  deleteAdminFeedbackEffect as deleteFeedbackEffect,
  getAdminFeedbackEffects as getFeedbackEffects,
  patchAdminFeedbackEffect as patchFeedbackEffect,
  uploadAdminFeedbackAsset as uploadFeedbackAsset,
  upsertAdminFeedbackEffect as upsertFeedbackEffect,
} from "../controllers/feedbackEffectController";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminMiddleware } from "../middleware/adminMiddleware";
import { feedbackUploadMiddleware } from "../middleware/feedbackUploadMiddleware";

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/feedback-effects", getFeedbackEffects);
router.post("/feedback-effects", upsertFeedbackEffect);
router.post(
  "/feedback-effects/upload",
  feedbackUploadMiddleware,
  uploadFeedbackAsset,
);
router.patch("/feedback-effects/:id", patchFeedbackEffect);
router.delete("/feedback-effects/:id", deleteFeedbackEffect);

router.get("/users", getAdminUsers);
router.get("/users/:userId/summary", getUserAdminSummary);
router.patch("/users/:userId/role", updateUserRole);
router.patch("/users/:userId/block", setUserBlockStatus);

export default router;
