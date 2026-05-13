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
  getMonthlyIncomeSummary,
  getMonthlyIncomeSummaryHistory,
} from "../services/financeService";
import { getCanonicalFinanceSummary } from "../services/canonicalFinanceSummaryService";
import {
  formatCategoryLabel,
  normalizeCategoryName,
} from "../utils/financeUtils";
import {
  errorMessage,
  friendlyError,
  successMessage,
} from "../utils/apiMessages";
import { AuthRequest } from "../middleware/authMiddleware";

function getErrorMessage(error: unknown) {
  return friendlyError(error instanceof Error ? error.message : "Server error");
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
      error: errorMessage("forbidden"),
      status: 403,
    };
  }

  return { userId: req.userId };
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
      message: `Balance source must be one of ${BALANCE_ACCOUNT_TYPES.join(", ")}. Pick a lane, champ.`,
    });
  }

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: errorMessage("invalidAmount"),
    });
  }

  try {
    const account = await addBalanceSource(auth.userId, type as any, amount);
    return res.status(201).json({
      success: true,
      message: successMessage("created", "balance-added"),
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
      message: "Amount must be zero or more. Negative money is how spreadsheets start plotting.",
    });
  }

  try {
    const updated = await updateBalanceSource(id, amount);
    return res.status(200).json({
      success: true,
      message: successMessage("updated", "balance-updated"),
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
      message: successMessage("deleted", "balance-deleted"),
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
      .json({ success: false, message: errorMessage("categoryMissing") });
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
      message: successMessage("created", "category-saved"),
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
    const categories = await Category.find({ userId: auth.userId })
      .sort({ name: 1 })
      .lean();
    return res.status(200).json({
      success: true,
      data: categories.map((category) => ({
        ...category,
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
          "Category is still carrying expenses. Reassign those first, then we can erase the evidence.",
      });
    }

    const deleted = await Category.findOneAndDelete({
      userId: auth.userId,
      name: normalized,
    });
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: errorMessage("notFound") });
    }

    return res.status(200).json({
      success: true,
      message: successMessage("deleted", "category-deleted"),
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
      .json({ success: false, message: errorMessage("invalidAmount") });
  }
  if (!category?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("categoryMissing") });
  }

  const expenseDate = date ? new Date(date) : new Date();
  if (Number.isNaN(expenseDate.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("invalidDate") });
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
        .json({ success: false, message: errorMessage("categoryNotFound") });
    }

    const expense = await createExpense(
      auth.userId,
      amount,
      normalizedCategory,
      normalizeOptionalText(note),
      expenseDate,
    );

    return res.status(201).json({
      success: true,
      message: successMessage("created", "expense-created"),
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
      .json({ success: false, message: errorMessage("missingId") });
  }
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("invalidAmount") });
  }
  if (!category?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("categoryMissing") });
  }

  const expenseDate = date ? new Date(date) : new Date();
  if (Number.isNaN(expenseDate.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("invalidDate") });
  }

  try {
    const updated = await updateExpense(
      auth.userId,
      id,
      amount,
      normalizeCategoryName(category),
      normalizeOptionalText(note),
      expenseDate,
    );
    return res.status(200).json({
      success: true,
      message: successMessage("updated", "expense-updated"),
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
      .json({ success: false, message: errorMessage("missingId") });
  }

  try {
    const deleted = await deleteExpense(auth.userId, id);
    return res.status(200).json({
      success: true,
      message: successMessage("deleted", "expense-deleted"),
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
      .json({ success: false, message: errorMessage("invalidAmount") });
  }

  const salaryDate = date ? new Date(date) : new Date();
  if (Number.isNaN(salaryDate.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("invalidDate") });
  }

  try {
    const salary = await addSalary(auth.userId, amount, salaryDate);
    return res.status(201).json({
      success: true,
      message: successMessage("created", "salary-added"),
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
      .json({ success: false, message: "Borrower is required. Money needs a destination, not a fog machine." });
  }
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("invalidAmount") });
  }
  if (!sourceType || !["PERSONAL", "BORROWED"].includes(sourceType)) {
    return res.status(400).json({
      success: false,
      message: "sourceType must be PERSONAL or BORROWED. The money origin story matters.",
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
      message: successMessage("created", "loan-created"),
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
      message: errorMessage("invalidAmount"),
    });
  }

  const creditorValue = Array.isArray(creditor) ? creditor[0] : creditor;

  try {
    const loan = await repayLoan(auth.userId, loanId, amount, creditorValue);
    return res.status(200).json({
      success: true,
      message: successMessage("updated", "loan-repaid"),
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
        message: "Month and year travel as a pair. Do not separate the duo.",
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
    const summary = await getCanonicalFinanceSummary(auth.userId);
    return res.status(200).json({
      success: true,
      message: successMessage("fetched", "finance-summary"),
      data: summary,
    });
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
      .json({ success: false, message: errorMessage("invalidAmount") });
  }
  if (!source?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("sourceMissing") });
  }

  const incomeDate = date ? new Date(date) : new Date();
  if (Number.isNaN(incomeDate.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("invalidDate") });
  }

  try {
    const income = await createIncomeRecord(
      auth.userId,
      amount,
      source.trim(),
      normalizeOptionalText(note),
      incomeDate,
    );
    return res.status(201).json({
      success: true,
      message: successMessage("created", "income-created"),
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
      .json({ success: false, message: errorMessage("invalidAmount") });
  }
  if (!sourceName?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("sourceMissing") });
  }

  const savingsDate = date ? new Date(date) : new Date();
  if (Number.isNaN(savingsDate.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: errorMessage("invalidDate") });
  }

  try {
    const savings = await createSavingsRecord(
      auth.userId,
      amount,
      sourceName.trim(),
      normalizeOptionalText(note),
      savingsDate,
    );
    return res.status(201).json({
      success: true,
      message: successMessage("created", "savings-created"),
      data: savings,
    });
  } catch (error: unknown) {
    return res
      .status(400)
      .json({ success: false, message: getErrorMessage(error) });
  }
};

export const getMonthlyIncome = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({
      success: false,
      message: "month must be an integer between 1 and 12",
      field: "month",
    });
  }
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    return res.status(400).json({
      success: false,
      message: "year must be a valid YYYY value",
      field: "year",
    });
  }

  try {
    const row = await getMonthlyIncomeSummary(auth.userId, year, month);
    return res.status(200).json({
      success: true,
      data: {
        month,
        year,
        salaryIncome: row.salaryIncome ?? 0,
        externalIncome: row.externalIncome ?? 0,
        totalIncome: row.totalIncome ?? 0,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const getMonthlyIncomeHistory = async (
  req: AuthRequest,
  res: Response,
) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const limit = req.query.limit ? Number(req.query.limit) : 12;
  if (!Number.isInteger(limit) || limit <= 0 || limit > 24) {
    return res.status(400).json({
      success: false,
      message: "limit must be an integer between 1 and 24",
      field: "limit",
    });
  }

  try {
    const rows = await getMonthlyIncomeSummaryHistory(auth.userId, limit);
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};
