import express from "express";
import {
  createCategory,
  addExpense,
  updateExpense,
  deleteExpense,
  getCategories,
  deleteCategory,
  upsertSalary,
  resetSalary,
  getSalary,
  getBalance,
  upsertBalance,
  clearBalance,
  getExpenses,
  getMoneySummary,
  getMostSpentCategory,
  createLoan,
  updateLoan,
  deleteLoan,
  payLoan,
  getLoans,
} from "../controllers/moneycontroler";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

router.get("/categories", getCategories);
router.delete("/category/:name", deleteCategory);
router.post("/category", createCategory);
router.post("/expense", addExpense);
router.patch("/expense/:id", updateExpense);
router.delete("/expense/:id", deleteExpense);
router.post("/salary", upsertSalary);
router.delete("/salary", resetSalary);
router.get("/salary/:userId", getSalary);
router.get("/balance/:userId", getBalance);
router.post("/balance", upsertBalance);
router.delete("/balance", clearBalance);
router.post("/loan", createLoan);
router.patch("/loan/:id", updateLoan);
router.post("/loan/:id/pay", payLoan);
router.delete("/loan/:id", deleteLoan);
router.get("/loans", getLoans);
router.get("/expenses", getExpenses);
router.get("/summary", getMoneySummary);
router.get("/most-spent-category/:userId", getMostSpentCategory);

export default router;
