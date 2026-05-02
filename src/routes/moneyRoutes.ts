import express from "express";
import {
  createCategory,
  addExpense,
  getCategories,
  deleteCategory,
  addBalance,
  updateBalance,
  deleteBalance,
  getBalance,
  getExpensesList,
  getMonthlyExpenseSummary,
  addSalaryEntry,
  getCurrentSalary,
  getSalaryHistoryList,
  createLoanEntry,
  repayLoanEntry,
  getLoanList,
  getDebtList,
  getFinanceSummary,
} from "../controllers/financeController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

router.get("/categories", getCategories);
router.delete("/category/:name", deleteCategory);
router.post("/category", createCategory);

router.post("/balance/add", addBalance);
router.patch("/balance/update/:id", updateBalance);
router.delete("/balance/:id", deleteBalance);
router.get("/balance", getBalance);

router.post("/expenses", addExpense);
router.get("/expenses", getExpensesList);
router.get("/expenses/monthly-summary", getMonthlyExpenseSummary);

router.post("/salary", addSalaryEntry);
router.get("/salary/current", getCurrentSalary);
router.get("/salary/history", getSalaryHistoryList);

router.post("/loans", createLoanEntry);
router.post("/loans/:id/repay", repayLoanEntry);
router.get("/loans", getLoanList);
router.get("/debts", getDebtList);

router.get("/summary", getFinanceSummary);

export default router;
