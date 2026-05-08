import { Response } from "express";
import Category from "../models/Category";
import Expense from "../models/Expense";
import BalanceAccount, {
  BALANCE_ACCOUNT_TYPES,
} from "../models/BalanceAccount";
import {
  addBalanceSource,
  updateBalanceSource,
  deleteBalanceSource,
  getBalanceSources,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenses,
  getMonthlyExpenseSummary as fetchMonthlyExpenseSummary,
  addSalary,
  getCurrentSalaryMonth,
  getSalaryHistory,
  createLoan,
  repayLoan,
  getLoans,
  getDebts,
  getSummary,
  getSummaryForMonth,
  getInsights as fetchInsights,
  createIncomeRecord,
  createSavingsRecord,
} from "../services/financeService";
import {
  formatCategoryLabel,
  normalizeCategoryName,
} from "../utils/financeUtils";
import { AuthRequest } from "../middleware/authMiddleware";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Server error";
}

function getAuthorizedUserId(
  req: AuthRequest,
  requestedUserId?: string,
): { userId: string } | { error: string; status: number } {
  if (!req.userId) {
    return {
      error: "Unauthorized",
      status: 401,
    };
  }

  if (requestedUserId && requestedUserId !== req.userId) {
    return {
      error: "You are not allowed to access another user's money data.",
      status: 403,
    };
  }

  return { userId: req.userId };
}

export const addBalance = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { type, amount } = req.body as {
    type?: string;
    amount?: number;
  };

  if (
    !type ||
    typeof type !== "string" ||
    !BALANCE_ACCOUNT_TYPES.includes(type as any)
  ) {
    return res.status(400).json({
      success: false,
      message: `Balance source type must be one of: ${BALANCE_ACCOUNT_TYPES.join(", ")}.`,
    });
  }

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Amount must be a positive number.",
    });
  }

  try {
    const account = await addBalanceSource(auth.userId, type as any, amount);
    return res.status(201).json({
      success: true,
      message: "Balance source added successfully.",
      data: account,
    });
  } catch (error: unknown) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const updateBalance = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { amount } = req.body as { amount?: number };

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Balance source id is required." });
  }

  if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
    return res.status(400).json({
      success: false,
      message: "Amount must be a non-negative number.",
    });
  }

  try {
    const updated = await updateBalanceSource(id, amount);
    return res.status(200).json({
      success: true,
      message: "Balance source updated successfully.",
      data: updated,
    });
  } catch (error: unknown) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const deleteBalance = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Balance source id is required." });
  }

  try {
    const deleted = await deleteBalanceSource(id);
    return res.status(200).json({
      success: true,
      message: "Balance source deleted successfully.",
      data: deleted,
    });
  } catch (error: unknown) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const getBalance = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  try {
    const balance = await getBalanceSources(auth.userId);
    return res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Category name is required." });
  }

  try {
    const normalized = normalizeCategoryName(name);
    const category = await Category.findOneAndUpdate(
      { userId: auth.userId, name: normalized },
      { userId: auth.userId, name: normalized },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Category saved successfully.",
      data: {
        ...(category?.toObject ? category.toObject() : category),
        label: formatCategoryLabel(normalized),
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const getCategories = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  try {
    const categories = await Category.find({ userId: auth.userId }).sort({
      name: 1,
    });
    return res.status(200).json({
      success: true,
      data: categories.map((category) => ({
        ...category.toObject(),
        label: formatCategoryLabel(category.name),
      })),
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const categoryName =
    typeof req.params.name === "string" ? req.params.name.trim() : "";
  if (!categoryName) {
    return res
      .status(400)
      .json({ success: false, message: "Category name is required." });
  }

  try {
    const normalized = normalizeCategoryName(categoryName);
    const expenseCount = await Expense.countDocuments({
      userId: auth.userId,
      category: normalized,
    });
    if (expenseCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete a category in use. Remove or reassign related entries first.",
      });
    }

    const deleted = await Category.findOneAndDelete({
      userId: auth.userId,
      name: normalized,
    });
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const addExpense = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { amount, category, note, date } = req.body as {
    amount?: number;
    category?: string;
    note?: string;
    date?: string;
  };

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "A valid amount is required." });
  }
  if (!category?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Expense category is required." });
  }
  if (!note?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Expense note is required." });
  }

  const expenseDate = date ? new Date(date) : new Date();
  if (Number.isNaN(expenseDate.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Expense date is invalid." });
  }

  try {
    const normalizedCategory = normalizeCategoryName(category);
    const existingCategory = await Category.findOne({
      userId: auth.userId,
      name: normalizedCategory,
    });
    if (!existingCategory) {
      return res
        .status(400)
        .json({ success: false, message: "Category does not exist." });
    }

    const expense = await createExpense(
      auth.userId,
      amount,
      normalizedCategory,
      note,
      expenseDate,
    );

    return res.status(201).json({
      success: true,
      message: "Expense created successfully.",
      data: expense,
    });
  } catch (error: unknown) {
    return res
      .status(400)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const getExpensesList = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const category =
    typeof req.query.category === "string" ? req.query.category : undefined;
  const startDate =
    typeof req.query.startDate === "string" ? req.query.startDate : undefined;
  const endDate =
    typeof req.query.endDate === "string" ? req.query.endDate : undefined;

  try {
    const result = await getExpenses(auth.userId, {
      page,
      limit,
      category,
      startDate,
      endDate,
    });

    const expenses = result.expenses.map((expense) => ({
      ...expense.toObject({ virtuals: true }),
      categoryLabel: formatCategoryLabel(expense.category),
    }));

    return res.status(200).json({
      success: true,
      data: expenses,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const updateExpenseEntry = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { amount, category, note, date } = req.body as {
    amount?: number;
    category?: string;
    note?: string;
    date?: string;
  };

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Expense id is required." });
  }
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "A valid amount is required." });
  }
  if (!category?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Expense category is required." });
  }
  if (!note?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Expense note is required." });
  }

  const expenseDate = date ? new Date(date) : new Date();
  if (Number.isNaN(expenseDate.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Expense date is invalid." });
  }

  try {
    const updated = await updateExpense(
      auth.userId,
      id,
      amount,
      normalizeCategoryName(category),
      note,
      expenseDate,
    );
    return res.status(200).json({
      success: true,
      message: "Expense updated successfully.",
      data: updated,
    });
  } catch (error: unknown) {
    return res
      .status(400)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const deleteExpenseEntry = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Expense id is required." });
  }

  try {
    const deleted = await deleteExpense(auth.userId, id);
    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully.",
      data: deleted,
    });
  } catch (error: unknown) {
    return res
      .status(400)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const getMonthlyExpenseSummary = async (
  req: AuthRequest,
  res: Response,
) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;

  try {
    const summary = await fetchMonthlyExpenseSummary(auth.userId, year, month);
    return res.status(200).json({ success: true, data: summary });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const addSalaryEntry = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { amount, date } = req.body as { amount?: number; date?: string };
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "A valid salary amount is required." });
  }

  const salaryDate = date ? new Date(date) : new Date();
  if (Number.isNaN(salaryDate.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Salary date is invalid." });
  }

  try {
    const salary = await addSalary(auth.userId, amount, salaryDate);
    return res.status(201).json({
      success: true,
      message: "Salary added successfully.",
      data: salary,
    });
  } catch (error: unknown) {
    return res
      .status(400)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const getCurrentSalary = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  try {
    const salary = await getCurrentSalaryMonth(auth.userId);
    return res.status(200).json({ success: true, data: salary });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const getSalaryHistoryList = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  try {
    const result = await getSalaryHistory(auth.userId, page, limit);
    return res.status(200).json({
      success: true,
      data: result.history,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const createLoanEntry = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { borrower, amount, sourceType, creditor } = req.body as {
    borrower?: string;
    amount?: number;
    sourceType?: string;
    creditor?: string;
  };

  if (!borrower?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Borrower is required." });
  }
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "A valid loan amount is required." });
  }
  if (!sourceType || !["PERSONAL", "BORROWED"].includes(sourceType)) {
    return res.status(400).json({
      success: false,
      message: "sourceType must be PERSONAL or BORROWED.",
    });
  }

  try {
    const loan = await createLoan(
      auth.userId,
      borrower,
      amount,
      sourceType as any,
      creditor,
    );
    return res.status(201).json({
      success: true,
      message: "Loan created successfully.",
      data: loan,
    });
  } catch (error: unknown) {
    return res
      .status(400)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const repayLoanEntry = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const loanId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const { amount, creditor } = req.body as {
    amount?: string | string[] | number;
    creditor?: string | string[];
  };

  if (!loanId) {
    return res
      .status(400)
      .json({ success: false, message: "Loan id is required." });
  }
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid repayment amount is required.",
    });
  }

  const creditorValue = Array.isArray(creditor) ? creditor[0] : creditor;

  try {
    const loan = await repayLoan(auth.userId, loanId, amount, creditorValue);
    return res.status(200).json({
      success: true,
      message: "Loan repayment recorded successfully.",
      data: loan,
    });
  } catch (error: unknown) {
    return res
      .status(400)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const getLoanList = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  try {
    const result = await getLoans(auth.userId, { status, page, limit });
    return res.status(200).json({
      success: true,
      data: result.loans,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const getDebtList = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  try {
    const debts = await getDebts(auth.userId);
    return res.status(200).json({ success: true, data: debts });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const getFinanceSummary = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const month = req.query.month ? Number(req.query.month) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;

  if (month !== undefined || year !== undefined) {
    if (
      month === undefined ||
      year === undefined ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 1900
    ) {
      return res.status(400).json({
        success: false,
        message: "Both month (1–12) and year must be provided together.",
      });
    }

    try {
      const summary = await getSummaryForMonth(auth.userId, month, year);
      return res.status(200).json({ success: true, data: summary });
    } catch (error: unknown) {
      return res
        .status(500)
        .json({ success: false, message: getErrorMessage(error) });
    }
  }

  try {
    const summary = await getSummary(auth.userId);
    return res.status(200).json({ success: true, data: summary });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const getFinanceInsights = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;

  try {
    const insights = await fetchInsights(auth.userId, year, month);
    return res.status(200).json({ success: true, data: insights });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const addIncome = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { amount, source, note, date } = req.body as {
    amount?: number;
    source?: string;
    note?: string;
    date?: string;
  };

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "A valid amount is required." });
  }
  if (!source?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Income source is required." });
  }
  if (!note?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Income note is required." });
  }

  const incomeDate = date ? new Date(date) : new Date();
  if (Number.isNaN(incomeDate.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Income date is invalid." });
  }

  try {
    const income = await createIncomeRecord(
      auth.userId,
      amount,
      source.trim(),
      note.trim(),
      incomeDate,
    );
    return res.status(201).json({
      success: true,
      message: "Income recorded successfully.",
      data: income,
    });
  } catch (error: unknown) {
    return res
      .status(400)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const addSavings = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { amount, sourceName, note, date } = req.body as {
    amount?: number;
    sourceName?: string;
    note?: string;
    date?: string;
  };

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "A valid amount is required." });
  }
  if (!sourceName?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Savings source name is required." });
  }
  if (!note?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Savings note is required." });
  }

  const savingsDate = date ? new Date(date) : new Date();
  if (Number.isNaN(savingsDate.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Savings date is invalid." });
  }

  try {
    const savings = await createSavingsRecord(
      auth.userId,
      amount,
      sourceName.trim(),
      note.trim(),
      savingsDate,
    );
    return res.status(201).json({
      success: true,
      message: "Savings recorded successfully.",
      data: savings,
    });
  } catch (error: unknown) {
    return res
      .status(400)
      .json({ success: false, message: getErrorMessage(error) });
  }
};
