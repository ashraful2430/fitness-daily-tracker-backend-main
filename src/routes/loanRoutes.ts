import express from "express";
import {
  createLoan,
  repayLoan,
  getUserLoans,
  getLoanDetails,
  getUserDebts,
  getFinancialSummary,
  getLoanTransactions,
  getLendingStats,
} from "../controllers/loanController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * POST /api/loans
 * Create a new loan
 */
router.post("/", createLoan);

/**
 * POST /api/loans/:id/repay
 * Process loan repayment
 */
router.post("/:id/repay", repayLoan);

/**
 * GET /api/loans
 * Get all loans for the authenticated user
 */
router.get("/", getUserLoans);

/**
 * GET /api/loans/:id
 * Get loan details with transaction history
 */
router.get("/:id", getLoanDetails);

/**
 * GET /api/loans/:id/transactions
 * Get loan transaction history
 */
router.get("/:id/transactions", getLoanTransactions);

/**
 * GET /api/debts
 * Get user's external debts
 */
router.get("/debts/list", getUserDebts);

/**
 * GET /api/financial-summary
 * Get comprehensive financial summary
 */
router.get("/financial/summary", getFinancialSummary);

/**
 * GET /api/lending-stats
 * Get lending statistics
 */
router.get("/stats/lending", getLendingStats);

export default router;
