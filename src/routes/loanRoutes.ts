import express from "express";
import {
  createLoan,
  getLoans,
  payLoan,
  deleteLoan,
} from "../controllers/loanLendingController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createLoan);
router.get("/", getLoans);
router.patch("/:id/pay", payLoan);
router.delete("/:id", deleteLoan);

export default router;
