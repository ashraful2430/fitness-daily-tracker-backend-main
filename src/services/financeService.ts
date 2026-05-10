import mongoose, { ClientSession } from "mongoose";
import BalanceAccount, {
  BalanceAccountSource,
  BalanceAccountType,
} from "../models/BalanceAccount";
import BalanceRecord from "../models/BalanceRecord";
import Category from "../models/Category";
import TransactionLedger, {
  TransactionSource,
  TransactionType,
} from "../models/TransactionLedger";
import {
  formatCategoryLabel,
  normalizeCategoryName,
} from "../utils/financeUtils";
import Expense from "../models/Expense";
import SalaryMonth from "../models/SalaryMonth";
import Loan, { LoanSourceType, LoanStatusType } from "../models/Loan";
import LoanLedger from "../models/LoanLedger";
import ExternalDebt from "../models/ExternalDebt";
import Income from "../models/Income";
import Savings from "../models/Savings";

const BALANCE_SOURCE_PRIORITY: BalanceAccountType[] = [
  "SALARY",
  "CASH",
  "BANK",
  "EXTERNAL",
];

function compareBalanceSources(
  a: { type: BalanceAccountType },
  b: { type: BalanceAccountType },
) {
  return (
    BALANCE_SOURCE_PRIORITY.indexOf(a.type) -
    BALANCE_SOURCE_PRIORITY.indexOf(b.type)
  );
}

async function recalculateTotalBalance(
  userId: string,
  session?: ClientSession,
): Promise<number> {
  const aggregation = BalanceAccount.aggregate([
    { $match: { userId } },
    { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
  ]);

  if (session) {
    aggregation.session(session);
  }

  const result = await aggregation;
  const total = result[0]?.totalAmount ?? 0;

  await BalanceRecord.findOneAndUpdate(
    { userId },
    { userId, amount: total },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    },
  );

  return total;
}

async function allocateAmountAcrossBalances(
  userId: string,
  amount: number,
  session: ClientSession,
): Promise<void> {
  const accounts = await BalanceAccount.find({ userId })
    .session(session)
    .sort({ type: 1 });

  accounts.sort(compareBalanceSources);

  let remaining = amount;

  for (const account of accounts) {
    if (remaining <= 0) {
      break;
    }

    const deduction = Math.min(account.amount, remaining);
    account.amount -= deduction;
    remaining -= deduction;

    if (account.amount <= 0) {
      await BalanceAccount.deleteOne({ _id: account._id }).session(session);
    } else {
      await account.save({ session });
    }
  }

  if (remaining > 0) {
    throw new Error(
      "Insufficient available balance to complete this transaction.",
    );
  }
}

function buildMonthYear(date: Date) {
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export async function getBalanceSources(userId: string) {
  const [sources, balanceSummary] = await Promise.all([
    BalanceAccount.find({ userId, source: { $ne: "EXPENSE_REFUND" } })
      .sort({ type: 1, createdAt: -1 })
      .lean(),
    BalanceAccount.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]),
  ]);

  return {
    totalBalance: balanceSummary[0]?.totalAmount ?? 0,
    sources,
  };
}

async function creditBalanceEntry(
  userId: string,
  type: BalanceAccountType,
  amount: number,
  session: ClientSession,
  source: BalanceAccountSource = "USER_ADDED",
) {
  const account = await BalanceAccount.create(
    [
      {
        userId,
        type,
        amount,
        source,
      },
    ],
    { session },
  );

  await TransactionLedger.create(
    [
      {
        userId,
        type: "CREDIT",
        source: "BALANCE_ADDED",
        amount,
        referenceId: account[0]._id.toString(),
      },
    ],
    { session },
  );

  return account[0];
}

export async function addBalanceSource(
  userId: string,
  type: BalanceAccountType,
  amount: number,
) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  const session = await mongoose.startSession();

  try {
    let account;
    await session.withTransaction(async () => {
      account = await creditBalanceEntry(userId, type, amount, session);
      await recalculateTotalBalance(userId, session);
    });

    return account;
  } finally {
    session.endSession();
  }
}

export async function updateBalanceSource(id: string, amount: number) {
  const session = await mongoose.startSession();

  try {
    let adjustment;
    await session.withTransaction(async () => {
      const existing = await BalanceAccount.findOne({ _id: id }).session(
        session,
      );
      if (!existing) {
        throw new Error("Balance source not found.");
      }

      const delta = amount - existing.amount;
      if (delta === 0) {
        adjustment = existing;
      } else {
        const created = await BalanceAccount.create(
          [
            {
              userId: existing.userId,
              type: existing.type,
              amount: delta,
              source: "BALANCE_ADJUSTMENT",
            },
          ],
          { session },
        );
        adjustment = created[0];

        await TransactionLedger.create(
          [
            {
              userId: existing.userId,
              type: delta >= 0 ? "CREDIT" : "DEBIT",
              source: "BALANCE_ADJUSTMENT",
              amount: Math.abs(delta),
              referenceId: existing._id.toString(),
            },
          ],
          { session },
        );
      }

      await recalculateTotalBalance(existing.userId, session);
    });

    return adjustment as typeof adjustment;
  } finally {
    session.endSession();
  }
}

export async function deleteBalanceSource(id: string) {
  const session = await mongoose.startSession();

  try {
    let removed;
    await session.withTransaction(async () => {
      removed = await BalanceAccount.findOneAndDelete({ _id: id }).session(
        session,
      );
      if (!removed) {
        throw new Error("Balance source not found.");
      }

      await recalculateTotalBalance(removed.userId, session);
    });

    return removed;
  } finally {
    session.endSession();
  }
}

export async function createExpense(
  userId: string,
  amount: number,
  category: string,
  note: string | null | undefined,
  date: Date,
) {
  if (amount <= 0) {
    throw new Error("Expense amount must be greater than zero.");
  }

  if (!category.trim()) {
    throw new Error("Expense category is required.");
  }

  const session = await mongoose.startSession();

  try {
    let expense: any;

    await session.withTransaction(async () => {
      const balanceSummary = await BalanceAccount.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
      ]).session(session);
      const available = balanceSummary[0]?.totalAmount ?? 0;

      if (amount > available) {
        throw new Error("Insufficient available balance for this expense.");
      }

      await allocateAmountAcrossBalances(userId, amount, session);

      expense = await Expense.create(
        [
          {
            userId,
            amount,
            category: category.toLowerCase().trim(),
            description: normalizeOptionalText(note),
            date,
          },
        ],
        { session },
      );

      await TransactionLedger.create(
        [
          {
            userId,
            type: "DEBIT",
            source: "EXPENSE",
            amount,
            referenceId: expense[0]._id.toString(),
          },
        ],
        { session },
      );

      const { month, year } = buildMonthYear(date);
      const salaryMonth = await SalaryMonth.findOne({
        userId,
        month,
        year,
      }).session(session);
      if (salaryMonth) {
        salaryMonth.totalSpent += amount;
        salaryMonth.remainingSalary = Math.max(
          salaryMonth.totalSalary - salaryMonth.totalSpent,
          0,
        );
        await salaryMonth.save({ session });
      }

      await recalculateTotalBalance(userId, session);
    });

    return expense[0];
  } finally {
    session.endSession();
  }
}

export async function getExpenses(
  userId: string,
  filters: {
    startDate?: string;
    endDate?: string;
    category?: string;
    page?: number;
    limit?: number;
  },
) {
  const query: any = { userId };
  const { startDate, endDate, category } = filters;

  if (category) {
    query.category = category.toLowerCase().trim();
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(startDate);
    }
    if (endDate) {
      query.date.$lte = new Date(endDate);
    }
  }

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit =
    filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
  const skip = (page - 1) * limit;

  const [expenses, total] = await Promise.all([
    Expense.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Expense.countDocuments(query),
  ]);

  return {
    expenses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export async function updateExpense(
  userId: string,
  expenseId: string,
  amount: number,
  category: string,
  note: string | null | undefined,
  date: Date,
) {
  if (amount <= 0) {
    throw new Error("Expense amount must be greater than zero.");
  }

  const session = await mongoose.startSession();

  try {
    let updatedExpense: any;

    await session.withTransaction(async () => {
      const existingExpense = await Expense.findOne({
        _id: expenseId,
        userId,
      }).session(session);
      if (!existingExpense) {
        throw new Error("Expense not found.");
      }

      const normalizedCategory = normalizeCategoryName(category);
      const existingCategory = await Category.findOne({
        userId,
        name: normalizedCategory,
      }).session(session);
      if (!existingCategory) {
        throw new Error("Category does not exist.");
      }

      const amountDelta = amount - existingExpense.amount;
      if (amountDelta > 0) {
        await allocateAmountAcrossBalances(userId, amountDelta, session);
      } else if (amountDelta < 0) {
        await creditBalanceEntry(
          userId,
          "CASH",
          -amountDelta,
          session,
          "BALANCE_ADJUSTMENT",
        );
        await TransactionLedger.create(
          [
            {
              userId,
              type: "CREDIT",
              source: "EXPENSE_REFUND",
              amount: -amountDelta,
              referenceId: existingExpense._id.toString(),
            },
          ],
          { session },
        );
      }

      const originalMonth = buildMonthYear(existingExpense.date);
      const updatedMonth = buildMonthYear(date);

      if (
        originalMonth.month === updatedMonth.month &&
        originalMonth.year === updatedMonth.year
      ) {
        const salaryMonth = await SalaryMonth.findOne({
          userId,
          month: updatedMonth.month,
          year: updatedMonth.year,
        }).session(session);
        if (salaryMonth) {
          salaryMonth.totalSpent += amountDelta;
          salaryMonth.remainingSalary = Math.max(
            salaryMonth.totalSalary - salaryMonth.totalSpent,
            0,
          );
          await salaryMonth.save({ session });
        }
      } else {
        const originalSalaryMonth = await SalaryMonth.findOne({
          userId,
          month: originalMonth.month,
          year: originalMonth.year,
        }).session(session);
        if (originalSalaryMonth) {
          originalSalaryMonth.totalSpent = Math.max(
            originalSalaryMonth.totalSpent - existingExpense.amount,
            0,
          );
          originalSalaryMonth.remainingSalary = Math.max(
            originalSalaryMonth.totalSalary - originalSalaryMonth.totalSpent,
            0,
          );
          await originalSalaryMonth.save({ session });
        }

        const newSalaryMonth = await SalaryMonth.findOne({
          userId,
          month: updatedMonth.month,
          year: updatedMonth.year,
        }).session(session);
        if (newSalaryMonth) {
          newSalaryMonth.totalSpent += amount;
          newSalaryMonth.remainingSalary = Math.max(
            newSalaryMonth.totalSalary - newSalaryMonth.totalSpent,
            0,
          );
          await newSalaryMonth.save({ session });
        }
      }

      existingExpense.amount = amount;
      existingExpense.category = normalizedCategory;
      existingExpense.description = normalizeOptionalText(note);
      existingExpense.date = date;
      await existingExpense.save({ session });
      updatedExpense = existingExpense;

      await recalculateTotalBalance(userId, session);
    });

    return updatedExpense;
  } finally {
    session.endSession();
  }
}

export async function deleteExpense(userId: string, expenseId: string) {
  const session = await mongoose.startSession();

  try {
    let deletedExpense: any;

    await session.withTransaction(async () => {
      deletedExpense = await Expense.findOneAndDelete({
        _id: expenseId,
        userId,
      }).session(session);
      if (!deletedExpense) {
        throw new Error("Expense not found.");
      }

      await creditBalanceEntry(
        userId,
        "CASH",
        deletedExpense.amount,
        session,
        "EXPENSE_REFUND",
      );
      await TransactionLedger.create(
        [
          {
            userId,
            type: "CREDIT",
            source: "EXPENSE_REFUND",
            amount: deletedExpense.amount,
            referenceId: deletedExpense._id.toString(),
          },
        ],
        { session },
      );

      const { month, year } = buildMonthYear(deletedExpense.date);
      const salaryMonth = await SalaryMonth.findOne({
        userId,
        month,
        year,
      }).session(session);
      if (salaryMonth) {
        salaryMonth.totalSpent = Math.max(
          salaryMonth.totalSpent - deletedExpense.amount,
          0,
        );
        salaryMonth.remainingSalary = Math.max(
          salaryMonth.totalSalary - salaryMonth.totalSpent,
          0,
        );
        await salaryMonth.save({ session });
      }

      await recalculateTotalBalance(userId, session);
    });

    return deletedExpense;
  } finally {
    session.endSession();
  }
}

export async function getMonthlyExpenseSummary(
  userId: string,
  year?: number,
  month?: number,
) {
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1;

  const start = new Date(targetYear, targetMonth - 1, 1);
  const end = new Date(targetYear, targetMonth, 1);

  const summary = await Expense.aggregate([
    {
      $match: {
        userId,
        date: {
          $gte: start,
          $lt: end,
        },
      },
    },
    {
      $group: {
        _id: "$category",
        totalSpent: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalSpent: -1 } },
  ]);

  const totalSpent = summary.reduce((sum, item) => sum + item.totalSpent, 0);

  return {
    month: targetMonth,
    year: targetYear,
    totalSpent,
    breakdown: summary.map((item) => ({
      category: item._id,
      categoryLabel: formatCategoryLabel(item._id),
      totalSpent: item.totalSpent,
      count: item.count,
    })),
  };
}

export async function addSalary(userId: string, amount: number, date: Date) {
  if (amount <= 0) {
    throw new Error("Salary amount must be greater than zero.");
  }

  const { month, year } = buildMonthYear(date);
  const session = await mongoose.startSession();

  try {
    let salaryMonth: any;
    await session.withTransaction(async () => {
      const existing = await SalaryMonth.findOne({
        userId,
        month,
        year,
      }).session(session);
      if (existing) {
        existing.totalSalary += amount;
        existing.remainingSalary = Math.max(
          existing.remainingSalary + amount,
          0,
        );
        await existing.save({ session });
        salaryMonth = existing;
      } else {
        const created = await SalaryMonth.create(
          [
            {
              userId,
              month,
              year,
              totalSalary: amount,
              totalSpent: 0,
              remainingSalary: amount,
            },
          ],
          { session },
        );
        salaryMonth = created[0];
      }

      await creditBalanceEntry(userId, "SALARY", amount, session, "SALARY_ADDED");

      await TransactionLedger.create(
        [
          {
            userId,
            type: "CREDIT",
            source: "SALARY_ADDED",
            amount,
            referenceId: salaryMonth._id.toString(),
          },
        ],
        { session },
      );
    });

    return salaryMonth;
  } finally {
    session.endSession();
  }
}

export async function getCurrentSalaryMonth(userId: string) {
  const { month, year } = buildMonthYear(new Date());
  const salaryMonth = await SalaryMonth.findOne({ userId, month, year });

  if (salaryMonth) {
    return salaryMonth;
  }

  return SalaryMonth.create({
    userId,
    month,
    year,
    totalSalary: 0,
    totalSpent: 0,
    remainingSalary: 0,
  });
}

export async function getSalaryHistory(
  userId: string,
  page?: number,
  limit?: number,
) {
  const pageNumber = page && page > 0 ? page : 1;
  const limitNumber = limit && limit > 0 ? Math.min(limit, 50) : 20;
  const skip = (pageNumber - 1) * limitNumber;

  const [history, total] = await Promise.all([
    SalaryMonth.find({ userId })
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    SalaryMonth.countDocuments({ userId }),
  ]);

  return {
    history,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.max(Math.ceil(total / limitNumber), 1),
    },
  };
}

export async function createLoan(
  userId: string,
  borrower: string,
  amount: number,
  sourceType: LoanSourceType,
  creditor?: string,
) {
  if (amount <= 0) {
    throw new Error("Loan amount must be greater than zero.");
  }
  if (!borrower.trim()) {
    throw new Error("Borrower is required.");
  }
  if (sourceType === "BORROWED" && !creditor?.trim()) {
    throw new Error("Creditor is required for borrowed loans.");
  }

  const session = await mongoose.startSession();

  try {
    let loan: any;
    await session.withTransaction(async () => {
      if (sourceType === "PERSONAL") {
        const balanceSummary = await BalanceAccount.aggregate([
          { $match: { userId } },
          { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
        ]).session(session);
        const available = balanceSummary[0]?.totalAmount ?? 0;
        if (amount > available) {
          throw new Error("Insufficient balance to fund the personal loan.");
        }

        await allocateAmountAcrossBalances(userId, amount, session);
      }

      loan = await Loan.create(
        [
          {
            userId,
            borrower: borrower.trim(),
            amount,
            remainingAmount: amount,
            sourceType,
            status: "ACTIVE" as LoanStatusType,
          },
        ],
        { session },
      );

      await LoanLedger.create(
        [
          {
            loanId: loan[0]._id.toString(),
            type: "DISBURSEMENT",
            amount,
          },
        ],
        { session },
      );

      if (sourceType === "BORROWED") {
        await ExternalDebt.findOneAndUpdate(
          {
            userId,
            creditor: creditor!.trim(),
          },
          {
            userId,
            creditor: creditor!.trim(),
            $inc: { totalAmount: amount, remainingAmount: amount },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            session,
          },
        );
      }

      await TransactionLedger.create(
        [
          {
            userId,
            type: "DEBIT",
            source: "LOAN_GIVEN",
            amount,
            referenceId: loan[0]._id.toString(),
          },
        ],
        { session },
      );

      await recalculateTotalBalance(userId, session);
    });

    return loan[0];
  } finally {
    session.endSession();
  }
}

export async function repayLoan(
  userId: string,
  loanId: string,
  amount: number,
  creditor?: string,
) {
  if (amount <= 0) {
    throw new Error("Repayment amount must be greater than zero.");
  }

  const session = await mongoose.startSession();

  try {
    let updatedLoan;
    await session.withTransaction(async () => {
      const loan = await Loan.findOne({ _id: loanId, userId }).session(session);
      if (!loan) {
        throw new Error("Loan not found.");
      }

      if (amount > loan.remainingAmount) {
        throw new Error("Repayment cannot exceed the remaining loan balance.");
      }

      loan.remainingAmount -= amount;
      loan.status = loan.remainingAmount === 0 ? "CLOSED" : "PARTIAL";
      await loan.save({ session });

      await LoanLedger.create(
        [
          {
            loanId: loan._id.toString(),
            type: "REPAYMENT",
            amount,
          },
        ],
        { session },
      );

      if (loan.sourceType === "PERSONAL") {
        const cashEntry = await BalanceAccount.findOneAndUpdate(
          { userId, type: "CASH" },
          { $inc: { amount } },
          { new: true, upsert: true, setDefaultsOnInsert: true, session },
        );

        if (!cashEntry) {
          throw new Error("Failed to credit loan repayment to cash balance.");
        }
      } else {
        const debtCreditor = creditor?.trim();
        if (!debtCreditor) {
          throw new Error("Creditor is required to repay borrowed debt.");
        }

        const debt = await ExternalDebt.findOne({
          userId,
          creditor: debtCreditor,
        }).session(session);
        if (!debt) {
          throw new Error("External debt record not found for this creditor.");
        }

        if (amount > debt.remainingAmount) {
          throw new Error(
            "Repayment cannot exceed the remaining external debt.",
          );
        }

        debt.remainingAmount -= amount;
        await debt.save({ session });
      }

      await TransactionLedger.create(
        [
          {
            userId,
            type: "CREDIT",
            source: "LOAN_REPAID",
            amount,
            referenceId: loan._id.toString(),
          },
        ],
        { session },
      );

      await recalculateTotalBalance(userId, session);
      updatedLoan = loan;
    });

    return updatedLoan;
  } finally {
    session.endSession();
  }
}

export async function getLoans(
  userId: string,
  filters: { status?: string; page?: number; limit?: number },
) {
  const query: any = { userId };
  if (filters.status) {
    query.status = filters.status.toUpperCase();
  }

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit =
    filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
  const skip = (page - 1) * limit;

  const [loans, total] = await Promise.all([
    Loan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Loan.countDocuments(query),
  ]);

  return {
    loans,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export async function getDebts(userId: string) {
  const debts = await ExternalDebt.find({ userId }).sort({ updatedAt: -1 }).lean();
  return debts;
}

export async function getInsights(
  userId: string,
  year?: number,
  month?: number,
) {
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1;

  const start = new Date(targetYear, targetMonth - 1, 1);
  const end = new Date(targetYear, targetMonth, 1);

  const breakdown = await Expense.aggregate([
    { $match: { userId, date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: "$category",
        totalSpent: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalSpent: -1 } },
  ]);

  const totalSpent = breakdown.reduce((sum, item) => sum + item.totalSpent, 0);

  const topCategories = breakdown.map((item) => ({
    category: item._id,
    categoryLabel: formatCategoryLabel(item._id),
    totalSpent: item.totalSpent,
    count: item.count,
    percentage:
      totalSpent > 0
        ? Math.round((item.totalSpent / totalSpent) * 10000) / 100
        : 0,
  }));

  const mostSpentCategory = topCategories[0] ?? null;

  return {
    period: { month: targetMonth, year: targetYear },
    totalSpent,
    mostSpentCategory,
    topCategories,
  };
}

export async function getSummaryForMonth(
  userId: string,
  month: number,
  year: number,
) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [balanceStats, expenseStats, topCategoriesAgg, salaryRecord] =
    await Promise.all([
      BalanceAccount.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { userId, date: { $gte: start, $lt: end } } },
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
        { $match: { userId, date: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: "$category",
            totalSpent: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalSpent: -1 } },
      ]),
      SalaryMonth.findOne({
        userId,
        $or: [{ year: { $lt: year } }, { year, month: { $lte: month } }],
      })
        .sort({ year: -1, month: -1 })
        .lean(),
    ]);

  const availableBalance = balanceStats[0]?.totalAmount ?? 0;
  const totalExpenses = expenseStats[0]?.totalExpenses ?? 0;
  const expenseCount = expenseStats[0]?.expenseCount ?? 0;
  const averageExpense =
    Math.round((expenseStats[0]?.averageExpense ?? 0) * 100) / 100;
  const salaryAmount = salaryRecord?.totalSalary ?? 0;
  const currentMonthSpent = totalExpenses;
  const remainingSalary = Math.max(salaryAmount - currentMonthSpent, 0);

  const topCategories = topCategoriesAgg.map((item: any) => ({
    category: item._id,
    categoryLabel: formatCategoryLabel(item._id),
    totalSpent: item.totalSpent,
    count: item.count,
  }));

  return {
    salaryAmount,
    availableBalance,
    totalExpenses,
    expenseCount,
    averageExpense,
    currentMonthSpent,
    remainingSalary,
    topCategories,
  };
}

export async function getSummary(userId: string) {
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [balanceStats, expenseStats, currentMonthStats, loanStats, totalDebt] =
    await Promise.all([
      BalanceAccount.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        {
          $match: { userId },
        },
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
        {
          $match: {
            userId,
            date: {
              $gte: startOfCurrentMonth,
              $lt: startOfNextMonth,
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
      Loan.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalLoans: { $sum: "$amount" } } },
      ]),
      ExternalDebt.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalDebt: { $sum: "$remainingAmount" } } },
      ]),
    ]);

  const totalBalance = balanceStats[0]?.totalAmount ?? 0;
  const totalExpenses = expenseStats[0]?.totalExpenses ?? 0;
  const averageExpense =
    Math.round((expenseStats[0]?.averageExpense ?? 0) * 100) / 100;
  const currentMonthSpent = currentMonthStats[0]?.totalSpent ?? 0;
  const totalLoansGiven = loanStats[0]?.totalLoans ?? 0;
  const totalExternalDebt = totalDebt[0]?.totalDebt ?? 0;

  return {
    totalBalance,
    totalExpenses,
    totalLoansGiven,
    totalDebt: totalExternalDebt,
    netPosition: totalBalance - totalExternalDebt,
    averageExpense,
    currentMonthSpent,
    expenseCount: expenseStats[0]?.expenseCount ?? 0,
  };
}

export async function createIncomeRecord(
  userId: string,
  amount: number,
  source: string,
  note: string | null | undefined,
  date: Date,
) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  const session = await mongoose.startSession();

  try {
    let income: any;
    await session.withTransaction(async () => {
      const docs = await Income.create(
        [{ userId, amount, source, note: normalizeOptionalText(note), date }],
        { session },
      );
      income = docs[0];

      await BalanceAccount.create(
        [{ userId, type: "EXTERNAL", amount, source: "INCOME_ADDED" }],
        { session },
      );

      await TransactionLedger.create(
        [
          {
            userId,
            type: "CREDIT",
            source: "INCOME_ADDED",
            amount,
            referenceId: income._id.toString(),
          },
        ],
        { session },
      );

      await recalculateTotalBalance(userId, session);
    });

    return income;
  } finally {
    session.endSession();
  }
}

export async function createSavingsRecord(
  userId: string,
  amount: number,
  sourceName: string,
  note: string | null | undefined,
  date: Date,
) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  const session = await mongoose.startSession();

  try {
    let savings: any;
    await session.withTransaction(async () => {
      const docs = await Savings.create(
        [
          {
            userId,
            amount,
            sourceName,
            note: normalizeOptionalText(note),
            date,
          },
        ],
        { session },
      );
      savings = docs[0];

      await BalanceAccount.create(
        [{ userId, type: "EXTERNAL", amount, source: "SAVINGS_ADDED" }],
        { session },
      );

      await TransactionLedger.create(
        [
          {
            userId,
            type: "CREDIT",
            source: "SAVINGS_ADDED",
            amount,
            referenceId: savings._id.toString(),
          },
        ],
        { session },
      );

      await recalculateTotalBalance(userId, session);
    });

    return savings;
  } finally {
    session.endSession();
  }
}
