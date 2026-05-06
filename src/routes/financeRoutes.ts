import express from "express";
import { getFinanceSummary } from "../controllers/loanLendingController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

router.get("/summary", getFinanceSummary);

export default router;
