import { Response } from "express";
import Expense from "../models/Expense";
import Category from "../models/Category";
import Salary from "../models/Salary";
import MoneyState from "../models/MoneyState";
import BalanceRecord from "../models/BalanceRecord";
import Loan from "../models/Loan";
import { AuthRequest } from "../middleware/authMiddleware";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Server error";
}

function normalizeCategoryName(name: string) {
  return name.trim().toLowerCase();
}

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function ensureMonthlyExpenseReset(userId: string) {
  const currentMonthKey = getMonthKey();
  const moneyState = await MoneyState.findOne({ userId });

  if (!moneyState) {
    await MoneyState.create({
      userId,
      lastExpenseResetMonth: currentMonthKey,
    });
    return;
  }

  if (moneyState.lastExpenseResetMonth === currentMonthKey) {
    return;
  }

  await Expense.deleteMany({ userId });

  moneyState.lastExpenseResetMonth = currentMonthKey;
  await moneyState.save();
}

async function getAvailableBalance(userId: string) {
  return BalanceRecord.findOne({ userId });
}

async function setAvailableBalance(userId: string, amount: number) {
  return BalanceRecord.findOneAndUpdate(
    { userId },
    { userId, amount },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
}

async function clearAvailableBalance(userId: string) {
  return BalanceRecord.findOneAndDelete({ userId });
}

async function adjustAvailableBalance(userId: string, delta: number) {
  return BalanceRecord.findOneAndUpdate(
    { userId },
    { userId, $inc: { amount: delta } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
}

function buildLoanSummary(userId: string) {
  return Loan.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalLoanAmount: { $sum: "$amount" },
        totalPaid: { $sum: "$paidAmount" },
        totalOutstanding: {
          $sum: {
            $subtract: ["$amount", "$paidAmount"],
          },
        },
        openLoanCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "open"] }, 1, 0],
          },
        },
        paidLoanCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "paid"] }, 1, 0],
          },
        },
      },
    },
  ]);
}

function parseOptionalPositiveInteger(value: unknown, fallback: number) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function buildExpenseDateRange(
  startDate?: string,
  endDate?: string,
):
  | { range: { $gte?: Date; $lte?: Date } | undefined }
  | { error: string; status: number } {
  if (!startDate && !endDate) {
    return { range: undefined as { $gte?: Date; $lte?: Date } | undefined };
  }

  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;

  if (
    (start && Number.isNaN(start.getTime())) ||
    (end && Number.isNaN(end.getTime()))
  ) {
    return {
      error: "Invalid startDate or endDate.",
      status: 400,
    };
  }

  if (start && end && start > end) {
    return {
      error: "startDate cannot be later than endDate.",
      status: 400,
    };
  }

  const range: { $gte?: Date; $lte?: Date } = {};

  if (start) {
    range.$gte = start;
  }

  if (end) {
    range.$lte = end;
  }

  return { range };
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

// Add a new category
export const createCategory = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Category name is required.",
    });
  }

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const normalizedName = normalizeCategoryName(name);
    const newCategory = await Category.findOneAndUpdate(
      { userId: auth.userId, name: normalizedName },
      { userId: auth.userId, name: normalizedName },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Category saved successfully.",
      data: newCategory,
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
    await ensureMonthlyExpenseReset(auth.userId);

    const categories = await Category.find({ userId: auth.userId }).sort({
      name: 1,
    });

    return res.status(200).json({
      success: true,
      data: categories,
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
    return res.status(400).json({
      success: false,
      message: "Category name is required.",
    });
  }

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const normalizedName = normalizeCategoryName(categoryName);
    const expenseCount = await Expense.countDocuments({
      userId: auth.userId,
      category: normalizedName,
    });

    if (expenseCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete a category that is already used by expenses. Remove or reassign those expenses first.",
      });
    }

    const deletedCategory = await Category.findOneAndDelete({
      userId: auth.userId,
      name: normalizedName,
    });

    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
      data: deletedCategory,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// Create or update salary
export const upsertSalary = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { amount } = req.body as { amount?: number };

  if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
    return res.status(400).json({
      success: false,
      message: "A valid salary amount is required.",
    });
  }

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const salary = await Salary.findOneAndUpdate(
      { userId: auth.userId },
      { userId: auth.userId, amount },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Salary saved successfully.",
      data: salary,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const resetSalary = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const deletedSalary = await Salary.findOneAndDelete({
      userId: auth.userId,
    });

    return res.status(200).json({
      success: true,
      message: deletedSalary
        ? "Salary reset successfully."
        : "Salary was already empty.",
      data: null,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// Add an expense
export const addExpense = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { amount, description, category, date } = req.body as {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
  };

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid expense amount is required.",
    });
  }

  if (!description?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Expense description is required.",
    });
  }

  if (!category?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Expense category is required.",
    });
  }

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const normalizedCategory = normalizeCategoryName(category);
    const existingCategory = await Category.findOne({
      userId: auth.userId,
      name: normalizedCategory,
    });

    if (!existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category does not exist for this user.",
      });
    }

    const expenseDate = date ? new Date(date) : new Date();
    if (Number.isNaN(expenseDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Expense date is invalid.",
      });
    }

    const newExpense = new Expense({
      userId: auth.userId,
      amount,
      description: description.trim(),
      category: normalizedCategory,
      date: expenseDate,
    });

    await newExpense.save();
    await adjustAvailableBalance(auth.userId, -amount);

    return res.status(201).json({
      success: true,
      message: "Expense added successfully.",
      data: newExpense,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { amount, description, category, date } = req.body as {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
  };

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid expense amount is required.",
    });
  }

  if (!description?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Expense description is required.",
    });
  }

  if (!category?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Expense category is required.",
    });
  }

  const expenseDate = date ? new Date(date) : new Date();
  if (Number.isNaN(expenseDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Expense date is invalid.",
    });
  }

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const normalizedCategory = normalizeCategoryName(category);
    const existingCategory = await Category.findOne({
      userId: auth.userId,
      name: normalizedCategory,
    });

    if (!existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category does not exist for this user.",
      });
    }

    const existingExpense = await Expense.findOne({
      _id: req.params.id,
      userId: auth.userId,
    });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    const amountDelta = existingExpense.amount - amount;

    const updatedExpense = await Expense.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: auth.userId,
      },
      {
        amount,
        description: description.trim(),
        category: normalizedCategory,
        date: expenseDate,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    await adjustAvailableBalance(auth.userId, amountDelta);

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully.",
      data: updatedExpense,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const deletedExpense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: auth.userId,
    });

    if (!deletedExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found.",
      });
    }

    await adjustAvailableBalance(auth.userId, deletedExpense.amount);

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully.",
      data: deletedExpense,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const createLoan = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { lender, reason, amount, date } = req.body as {
    lender?: string;
    reason?: string;
    amount?: number;
    date?: string;
  };

  if (!lender?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Loan lender name is required.",
    });
  }

  if (!reason?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Loan reason is required.",
    });
  }

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid loan amount is required.",
    });
  }

  const loanDate = date ? new Date(date) : new Date();
  if (Number.isNaN(loanDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Loan date is invalid.",
    });
  }

  try {
    const loan = await Loan.create({
      userId: auth.userId,
      lender: lender.trim(),
      reason: reason.trim(),
      amount,
      paidAmount: 0,
      status: "open",
      date: loanDate,
    });

    return res.status(201).json({
      success: true,
      message: "Loan added successfully.",
      data: loan,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const updateLoan = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { lender, reason, amount } = req.body as {
    lender?: string;
    reason?: string;
    amount?: number;
  };

  const loan = await Loan.findOne({ _id: req.params.id, userId: auth.userId });
  if (!loan) {
    return res.status(404).json({
      success: false,
      message: "Loan not found.",
    });
  }

  if (loan.status === "paid") {
    return res.status(400).json({
      success: false,
      message: "Paid loans cannot be updated.",
    });
  }

  if (amount !== undefined) {
    if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid loan amount is required.",
      });
    }
    if (amount < loan.paidAmount) {
      return res.status(400).json({
        success: false,
        message: "Loan amount cannot be lower than the amount already paid.",
      });
    }
  }

  try {
    const updatedLoan = await Loan.findOneAndUpdate(
      { _id: req.params.id, userId: auth.userId },
      {
        ...(lender ? { lender: lender.trim() } : {}),
        ...(reason ? { reason: reason.trim() } : {}),
        ...(amount !== undefined ? { amount } : {}),
      },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Loan updated successfully.",
      data: updatedLoan,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const payLoan = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { amount } = req.body as { amount?: number };
  const loan = await Loan.findOne({ _id: req.params.id, userId: auth.userId });
  if (!loan) {
    return res.status(404).json({
      success: false,
      message: "Loan not found.",
    });
  }

  if (loan.status === "paid") {
    return res.status(400).json({
      success: false,
      message: "Loan is already paid.",
    });
  }

  const remaining = loan.amount - loan.paidAmount;
  const paymentAmount =
    amount === undefined
      ? remaining
      : typeof amount === "number"
        ? amount
        : NaN;

  if (
    typeof paymentAmount !== "number" ||
    Number.isNaN(paymentAmount) ||
    paymentAmount <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid payment amount is required.",
    });
  }

  if (paymentAmount > remaining) {
    return res.status(400).json({
      success: false,
      message: "Payment cannot exceed the remaining loan balance.",
    });
  }

  try {
    const updatedLoan = await Loan.findOneAndUpdate(
      { _id: req.params.id, userId: auth.userId },
      {
        $inc: { paidAmount: paymentAmount },
        ...(paymentAmount === remaining
          ? { status: "paid", paidAt: new Date() }
          : {}),
      },
      {
        new: true,
        runValidators: true,
      },
    );

    await adjustAvailableBalance(auth.userId, -paymentAmount);

    return res.status(200).json({
      success: true,
      message: "Loan payment recorded successfully.",
      data: updatedLoan,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const deleteLoan = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const loan = await Loan.findOne({ _id: req.params.id, userId: auth.userId });
  if (!loan) {
    return res.status(404).json({
      success: false,
      message: "Loan not found.",
    });
  }

  if (loan.paidAmount > 0) {
    return res.status(409).json({
      success: false,
      message:
        "Cannot delete a loan that has already received a payment. Mark it paid or create a correction entry instead.",
    });
  }

  try {
    await Loan.deleteOne({ _id: req.params.id, userId: auth.userId });

    return res.status(200).json({
      success: true,
      message: "Loan deleted successfully.",
      data: null,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const getLoans = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const status =
    typeof req.query.status === "string" ? req.query.status.trim() : undefined;
  const page = parseOptionalPositiveInteger(req.query.page, 1);
  const limit = Math.min(
    parseOptionalPositiveInteger(req.query.limit, 50),
    200,
  );

  try {
    const query: {
      userId: string;
      status?: string;
    } = {
      userId: auth.userId,
    };

    if (status) {
      if (!["open", "paid"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Loan status filter must be either 'open' or 'paid'.",
        });
      }
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const [loans, total] = await Promise.all([
      Loan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Loan.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: loans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// Get salary by userId
export const getSalary = async (req: AuthRequest, res: Response) => {
  const requestedUserId =
    typeof req.params.userId === "string" ? req.params.userId : undefined;
  const auth = getAuthorizedUserId(req, requestedUserId);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const salary = await Salary.findOne({ userId: auth.userId });

    return res.status(200).json({
      success: true,
      data: salary || null,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const getBalance = async (req: AuthRequest, res: Response) => {
  const requestedUserId =
    typeof req.params.userId === "string" ? req.params.userId : undefined;
  const auth = getAuthorizedUserId(req, requestedUserId);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const balance = await getAvailableBalance(auth.userId);
    return res.status(200).json({
      success: true,
      data: balance || null,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const upsertBalance = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const { amount } = req.body as { amount?: number };

  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return res.status(400).json({
      success: false,
      message: "A valid balance amount is required.",
    });
  }

  try {
    const balance = await setAvailableBalance(auth.userId, amount);
    return res.status(200).json({
      success: true,
      message: "Balance saved successfully.",
      data: balance,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const clearBalance = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  try {
    const deletedBalance = await clearAvailableBalance(auth.userId);
    return res.status(200).json({
      success: true,
      message: deletedBalance
        ? "Balance cleared successfully."
        : "No available balance existed.",
      data: null,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// Get all expenses for a user (can be filtered by date for daily, weekly, monthly)
export const getExpenses = async (req: AuthRequest, res: Response) => {
  const requestedUserId =
    typeof req.query.userId === "string" ? req.query.userId : undefined;
  const auth = getAuthorizedUserId(req, requestedUserId);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const startDate =
    typeof req.query.startDate === "string" ? req.query.startDate : undefined;
  const endDate =
    typeof req.query.endDate === "string" ? req.query.endDate : undefined;
  const category =
    typeof req.query.category === "string" ? req.query.category.trim() : "";
  const page = parseOptionalPositiveInteger(req.query.page, 1);
  const limit = Math.min(
    parseOptionalPositiveInteger(req.query.limit, 20),
    100,
  );

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const query: {
      userId: string;
      date?: {
        $gte?: Date;
        $lte?: Date;
      };
      category?: string;
    } = {
      userId: auth.userId,
    };

    const dateRange = buildExpenseDateRange(startDate, endDate);
    if ("error" in dateRange) {
      return res.status(dateRange.status).json({
        success: false,
        message: dateRange.error,
      });
    }

    if (dateRange.range) {
      query.date = dateRange.range;
    }

    if (category) {
      query.category = normalizeCategoryName(category);
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

export const getMoneySummary = async (req: AuthRequest, res: Response) => {
  const auth = getAuthorizedUserId(req);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  const startDate =
    typeof req.query.startDate === "string" ? req.query.startDate : undefined;
  const endDate =
    typeof req.query.endDate === "string" ? req.query.endDate : undefined;

  const dateRange = buildExpenseDateRange(startDate, endDate);
  if ("error" in dateRange) {
    return res.status(dateRange.status).json({
      success: false,
      message: dateRange.error,
    });
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const filter = {
      userId: auth.userId,
      ...(dateRange.range ? { date: dateRange.range } : {}),
    };

    const [
      salary,
      balance,
      filteredExpenseStats,
      categoryBreakdown,
      currentMonthSpent,
      loanSummary,
    ] = await Promise.all([
      Salary.findOne({ userId: auth.userId }),
      getAvailableBalance(auth.userId),
      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: "$amount" },
            expenseCount: { $sum: 1 },
            averageExpense: { $avg: "$amount" },
          },
        },
      ]),
      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$category",
            totalSpent: { $sum: "$amount" },
            expenseCount: { $sum: 1 },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
      ]),
      Expense.aggregate([
        {
          $match: {
            userId: auth.userId,
            date: {
              $gte: currentMonthStart,
              $lt: nextMonthStart,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: "$amount" },
          },
        },
      ]),
      buildLoanSummary(auth.userId),
    ]);

    const expenseStats = filteredExpenseStats[0] ?? {
      totalExpenses: 0,
      expenseCount: 0,
      averageExpense: 0,
    };

    const loanStats = loanSummary[0] ?? {
      totalLoanAmount: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      openLoanCount: 0,
      paidLoanCount: 0,
    };

    const monthlySpent = currentMonthSpent[0]?.totalSpent ?? 0;
    const salaryAmount = salary?.amount ?? 0;
    const availableBalance = balance?.amount ?? 0;
    const totalBalance = salaryAmount + availableBalance;
    const netBalance = totalBalance - loanStats.totalOutstanding;
    const remainingSalary = Math.max(salaryAmount - monthlySpent, 0);

    return res.status(200).json({
      success: true,
      data: {
        salaryAmount,
        availableBalance: balance?.amount ?? null,
        totalBalance,
        netBalance,
        totalExpenses: expenseStats.totalExpenses,
        expenseCount: expenseStats.expenseCount,
        averageExpense:
          Math.round((expenseStats.averageExpense ?? 0) * 100) / 100,
        currentMonthSpent: monthlySpent,
        remainingSalary,
        topCategories: categoryBreakdown,
        totalLoanAmount: loanStats.totalLoanAmount,
        totalLoanPaid: loanStats.totalPaid,
        outstandingLoanAmount: loanStats.totalOutstanding,
        openLoanCount: loanStats.openLoanCount,
        paidLoanCount: loanStats.paidLoanCount,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};

// Get the category where a user spent the most
export const getMostSpentCategory = async (req: AuthRequest, res: Response) => {
  const requestedUserId =
    typeof req.params.userId === "string" ? req.params.userId : undefined;
  const auth = getAuthorizedUserId(req, requestedUserId);
  if ("error" in auth) {
    return res
      .status(auth.status)
      .json({ success: false, message: auth.error });
  }

  try {
    await ensureMonthlyExpenseReset(auth.userId);

    const expenses = await Expense.aggregate([
      { $match: { userId: auth.userId } },
      { $group: { _id: "$category", totalSpent: { $sum: "$amount" } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 1 },
    ]);

    if (!expenses.length) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: expenses[0],
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};
