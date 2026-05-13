import express from "express";
import {
  getAdminUsers,
  getUserAdminSummary,
  setUserBlockStatus,
  updateUserRole,
} from "../controllers/adminController";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminMiddleware } from "../middleware/adminMiddleware";

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/users", getAdminUsers);
router.get("/users/:userId/summary", getUserAdminSummary);
router.patch("/users/:userId/role", updateUserRole);
router.patch("/users/:userId/block", setUserBlockStatus);

export default router;
