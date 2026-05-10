import express from "express";
import {
  createLending,
  getLendings,
  repayLending,
  deleteLending,
} from "../controllers/loanLendingController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createLending);
router.get("/", getLendings);
router.patch("/:id/repaid", repayLending);
router.delete("/:id", deleteLending);

export default router;
