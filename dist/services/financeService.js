"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalanceSources = getBalanceSources;
exports.addBalanceSource = addBalanceSource;
exports.updateBalanceSource = updateBalanceSource;
exports.deleteBalanceSource = deleteBalanceSource;
exports.createExpense = createExpense;
exports.getExpenses = getExpenses;
exports.updateExpense = updateExpense;
exports.deleteExpense = deleteExpense;
exports.getMonthlyExpenseSummary = getMonthlyExpenseSummary;
exports.addSalary = addSalary;
exports.getCurrentSalaryMonth = getCurrentSalaryMonth;
exports.getSalaryHistory = getSalaryHistory;
exports.createLoan = createLoan;
exports.repayLoan = repayLoan;
exports.getLoans = getLoans;
exports.getDebts = getDebts;
exports.getSummary = getSummary;
const mongoose_1 = __importDefault(require("mongoose"));
const BalanceAccount_1 = __importDefault(require("../models/BalanceAccount"));
const BalanceRecord_1 = __importDefault(require("../models/BalanceRecord"));
const Category_1 = __importDefault(require("../models/Category"));
const TransactionLedger_1 = __importDefault(require("../models/TransactionLedger"));
const financeUtils_1 = require("../utils/financeUtils");
const Expense_1 = __importDefault(require("../models/Expense"));
const SalaryMonth_1 = __importDefault(require("../models/SalaryMonth"));
const Loan_1 = __importDefault(require("../models/Loan"));
const LoanLedger_1 = __importDefault(require("../models/LoanLedger"));
const ExternalDebt_1 = __importDefault(require("../models/ExternalDebt"));
const BALANCE_SOURCE_PRIORITY = [
    "SALARY",
    "CASH",
    "BANK",
    "EXTERNAL",
];
function compareBalanceSources(a, b) {
    return (BALANCE_SOURCE_PRIORITY.indexOf(a.type) -
        BALANCE_SOURCE_PRIORITY.indexOf(b.type));
}
async function recalculateTotalBalance(userId, session) {
    const aggregation = BalanceAccount_1.default.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]);
    if (session) {
        aggregation.session(session);
    }
    const result = await aggregation;
    const total = result[0]?.totalAmount ?? 0;
    await BalanceRecord_1.default.findOneAndUpdate({ userId }, { userId, amount: total }, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
    });
    return total;
}
async function allocateAmountAcrossBalances(userId, amount, session) {
    const accounts = await BalanceAccount_1.default.find({ userId })
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
            await BalanceAccount_1.default.deleteOne({ _id: account._id }).session(session);
        }
        else {
            await account.save({ session });
        }
    }
    if (remaining > 0) {
        throw new Error("Insufficient available balance to complete this transaction.");
    }
}
function buildMonthYear(date) {
    return {
        month: date.getMonth() + 1,
        year: date.getFullYear(),
    };
}
async function getBalanceSources(userId) {
    const [sources, balanceSummary] = await Promise.all([
        BalanceAccount_1.default.find({ userId }).sort({ type: 1, createdAt: -1 }),
        BalanceAccount_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
        ]),
    ]);
    return {
        totalBalance: balanceSummary[0]?.totalAmount ?? 0,
        sources,
    };
}
async function creditBalanceEntry(userId, type, amount, session) {
    const account = await BalanceAccount_1.default.create([
        {
            userId,
            type,
            amount,
        },
    ], { session });
    await TransactionLedger_1.default.create([
        {
            userId,
            type: "CREDIT",
            source: "BALANCE_ADDED",
            amount,
            referenceId: account[0]._id.toString(),
        },
    ], { session });
    return account[0];
}
async function addBalanceSource(userId, type, amount) {
    if (amount <= 0) {
        throw new Error("Amount must be greater than zero.");
    }
    const session = await mongoose_1.default.startSession();
    try {
        let account;
        await session.withTransaction(async () => {
            account = await creditBalanceEntry(userId, type, amount, session);
            await recalculateTotalBalance(userId, session);
        });
        return account;
    }
    finally {
        session.endSession();
    }
}
async function updateBalanceSource(id, amount) {
    const session = await mongoose_1.default.startSession();
    try {
        let adjustment;
        await session.withTransaction(async () => {
            const existing = await BalanceAccount_1.default.findOne({ _id: id }).session(session);
            if (!existing) {
                throw new Error("Balance source not found.");
            }
            const delta = amount - existing.amount;
            if (delta === 0) {
                adjustment = existing;
            }
            else {
                const created = await BalanceAccount_1.default.create([
                    {
                        userId: existing.userId,
                        type: existing.type,
                        amount: delta,
                    },
                ], { session });
                adjustment = created[0];
                await TransactionLedger_1.default.create([
                    {
                        userId: existing.userId,
                        type: delta >= 0 ? "CREDIT" : "DEBIT",
                        source: "BALANCE_ADJUSTMENT",
                        amount: Math.abs(delta),
                        referenceId: existing._id.toString(),
                    },
                ], { session });
            }
            await recalculateTotalBalance(existing.userId, session);
        });
        return adjustment;
    }
    finally {
        session.endSession();
    }
}
async function deleteBalanceSource(id) {
    const session = await mongoose_1.default.startSession();
    try {
        let removed;
        await session.withTransaction(async () => {
            removed = await BalanceAccount_1.default.findOneAndDelete({ _id: id }).session(session);
            if (!removed) {
                throw new Error("Balance source not found.");
            }
            await recalculateTotalBalance(removed.userId, session);
        });
        return removed;
    }
    finally {
        session.endSession();
    }
}
async function createExpense(userId, amount, category, note, date) {
    if (amount <= 0) {
        throw new Error("Expense amount must be greater than zero.");
    }
    if (!category.trim()) {
        throw new Error("Expense category is required.");
    }
    const session = await mongoose_1.default.startSession();
    try {
        let expense;
        await session.withTransaction(async () => {
            const balanceSummary = await BalanceAccount_1.default.aggregate([
                { $match: { userId } },
                { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
            ]).session(session);
            const available = balanceSummary[0]?.totalAmount ?? 0;
            if (amount > available) {
                throw new Error("Insufficient available balance for this expense.");
            }
            await allocateAmountAcrossBalances(userId, amount, session);
            expense = await Expense_1.default.create([
                {
                    userId,
                    amount,
                    category: category.toLowerCase().trim(),
                    description: note.trim(),
                    date,
                },
            ], { session });
            await TransactionLedger_1.default.create([
                {
                    userId,
                    type: "DEBIT",
                    source: "EXPENSE",
                    amount,
                    referenceId: expense[0]._id.toString(),
                },
            ], { session });
            const { month, year } = buildMonthYear(date);
            const salaryMonth = await SalaryMonth_1.default.findOne({
                userId,
                month,
                year,
            }).session(session);
            if (salaryMonth) {
                salaryMonth.totalSpent += amount;
                salaryMonth.remainingSalary = Math.max(salaryMonth.totalSalary - salaryMonth.totalSpent, 0);
                await salaryMonth.save({ session });
            }
            await recalculateTotalBalance(userId, session);
        });
        return expense[0];
    }
    finally {
        session.endSession();
    }
}
async function getExpenses(userId, filters) {
    const query = { userId };
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
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const skip = (page - 1) * limit;
    const [expenses, total] = await Promise.all([
        Expense_1.default.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Expense_1.default.countDocuments(query),
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
async function updateExpense(userId, expenseId, amount, category, note, date) {
    if (amount <= 0) {
        throw new Error("Expense amount must be greater than zero.");
    }
    const session = await mongoose_1.default.startSession();
    try {
        let updatedExpense;
        await session.withTransaction(async () => {
            const existingExpense = await Expense_1.default.findOne({
                _id: expenseId,
                userId,
            }).session(session);
            if (!existingExpense) {
                throw new Error("Expense not found.");
            }
            const normalizedCategory = (0, financeUtils_1.normalizeCategoryName)(category);
            const existingCategory = await Category_1.default.findOne({
                userId,
                name: normalizedCategory,
            }).session(session);
            if (!existingCategory) {
                throw new Error("Category does not exist.");
            }
            const amountDelta = amount - existingExpense.amount;
            if (amountDelta > 0) {
                await allocateAmountAcrossBalances(userId, amountDelta, session);
            }
            else if (amountDelta < 0) {
                await creditBalanceEntry(userId, "CASH", -amountDelta, session);
                await TransactionLedger_1.default.create([
                    {
                        userId,
                        type: "CREDIT",
                        source: "EXPENSE_REFUND",
                        amount: -amountDelta,
                        referenceId: existingExpense._id.toString(),
                    },
                ], { session });
            }
            const originalMonth = buildMonthYear(existingExpense.date);
            const updatedMonth = buildMonthYear(date);
            if (originalMonth.month === updatedMonth.month &&
                originalMonth.year === updatedMonth.year) {
                const salaryMonth = await SalaryMonth_1.default.findOne({
                    userId,
                    month: updatedMonth.month,
                    year: updatedMonth.year,
                }).session(session);
                if (salaryMonth) {
                    salaryMonth.totalSpent += amountDelta;
                    salaryMonth.remainingSalary = Math.max(salaryMonth.totalSalary - salaryMonth.totalSpent, 0);
                    await salaryMonth.save({ session });
                }
            }
            else {
                const originalSalaryMonth = await SalaryMonth_1.default.findOne({
                    userId,
                    month: originalMonth.month,
                    year: originalMonth.year,
                }).session(session);
                if (originalSalaryMonth) {
                    originalSalaryMonth.totalSpent = Math.max(originalSalaryMonth.totalSpent - existingExpense.amount, 0);
                    originalSalaryMonth.remainingSalary = Math.max(originalSalaryMonth.totalSalary - originalSalaryMonth.totalSpent, 0);
                    await originalSalaryMonth.save({ session });
                }
                const newSalaryMonth = await SalaryMonth_1.default.findOne({
                    userId,
                    month: updatedMonth.month,
                    year: updatedMonth.year,
                }).session(session);
                if (newSalaryMonth) {
                    newSalaryMonth.totalSpent += amount;
                    newSalaryMonth.remainingSalary = Math.max(newSalaryMonth.totalSalary - newSalaryMonth.totalSpent, 0);
                    await newSalaryMonth.save({ session });
                }
            }
            existingExpense.amount = amount;
            existingExpense.category = normalizedCategory;
            existingExpense.description = note.trim();
            existingExpense.date = date;
            await existingExpense.save({ session });
            updatedExpense = existingExpense;
            await recalculateTotalBalance(userId, session);
        });
        return updatedExpense;
    }
    finally {
        session.endSession();
    }
}
async function deleteExpense(userId, expenseId) {
    const session = await mongoose_1.default.startSession();
    try {
        let deletedExpense;
        await session.withTransaction(async () => {
            deletedExpense = await Expense_1.default.findOneAndDelete({
                _id: expenseId,
                userId,
            }).session(session);
            if (!deletedExpense) {
                throw new Error("Expense not found.");
            }
            await creditBalanceEntry(userId, "CASH", deletedExpense.amount, session);
            await TransactionLedger_1.default.create([
                {
                    userId,
                    type: "CREDIT",
                    source: "EXPENSE_REFUND",
                    amount: deletedExpense.amount,
                    referenceId: deletedExpense._id.toString(),
                },
            ], { session });
            const { month, year } = buildMonthYear(deletedExpense.date);
            const salaryMonth = await SalaryMonth_1.default.findOne({
                userId,
                month,
                year,
            }).session(session);
            if (salaryMonth) {
                salaryMonth.totalSpent = Math.max(salaryMonth.totalSpent - deletedExpense.amount, 0);
                salaryMonth.remainingSalary = Math.max(salaryMonth.totalSalary - salaryMonth.totalSpent, 0);
                await salaryMonth.save({ session });
            }
            await recalculateTotalBalance(userId, session);
        });
        return deletedExpense;
    }
    finally {
        session.endSession();
    }
}
async function getMonthlyExpenseSummary(userId, year, month) {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;
    const start = new Date(targetYear, targetMonth - 1, 1);
    const end = new Date(targetYear, targetMonth, 1);
    const summary = await Expense_1.default.aggregate([
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
            categoryLabel: (0, financeUtils_1.formatCategoryLabel)(item._id),
            totalSpent: item.totalSpent,
            count: item.count,
        })),
    };
}
async function addSalary(userId, amount, date) {
    if (amount <= 0) {
        throw new Error("Salary amount must be greater than zero.");
    }
    const { month, year } = buildMonthYear(date);
    const session = await mongoose_1.default.startSession();
    try {
        let salaryMonth;
        await session.withTransaction(async () => {
            const existing = await SalaryMonth_1.default.findOne({
                userId,
                month,
                year,
            }).session(session);
            if (existing) {
                existing.totalSalary += amount;
                existing.remainingSalary = Math.max(existing.remainingSalary + amount, 0);
                await existing.save({ session });
                salaryMonth = existing;
            }
            else {
                const created = await SalaryMonth_1.default.create([
                    {
                        userId,
                        month,
                        year,
                        totalSalary: amount,
                        totalSpent: 0,
                        remainingSalary: amount,
                    },
                ], { session });
                salaryMonth = created[0];
            }
            await creditBalanceEntry(userId, "SALARY", amount, session);
            await TransactionLedger_1.default.create([
                {
                    userId,
                    type: "CREDIT",
                    source: "SALARY_ADDED",
                    amount,
                    referenceId: salaryMonth._id.toString(),
                },
            ], { session });
        });
        return salaryMonth;
    }
    finally {
        session.endSession();
    }
}
async function getCurrentSalaryMonth(userId) {
    const { month, year } = buildMonthYear(new Date());
    const salaryMonth = await SalaryMonth_1.default.findOne({ userId, month, year });
    if (salaryMonth) {
        return salaryMonth;
    }
    return SalaryMonth_1.default.create({
        userId,
        month,
        year,
        totalSalary: 0,
        totalSpent: 0,
        remainingSalary: 0,
    });
}
async function getSalaryHistory(userId, page, limit) {
    const pageNumber = page && page > 0 ? page : 1;
    const limitNumber = limit && limit > 0 ? Math.min(limit, 50) : 20;
    const skip = (pageNumber - 1) * limitNumber;
    const [history, total] = await Promise.all([
        SalaryMonth_1.default.find({ userId })
            .sort({ year: -1, month: -1 })
            .skip(skip)
            .limit(limitNumber),
        SalaryMonth_1.default.countDocuments({ userId }),
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
async function createLoan(userId, borrower, amount, sourceType, creditor) {
    if (amount <= 0) {
        throw new Error("Loan amount must be greater than zero.");
    }
    if (!borrower.trim()) {
        throw new Error("Borrower is required.");
    }
    if (sourceType === "BORROWED" && !creditor?.trim()) {
        throw new Error("Creditor is required for borrowed loans.");
    }
    const session = await mongoose_1.default.startSession();
    try {
        let loan;
        await session.withTransaction(async () => {
            if (sourceType === "PERSONAL") {
                const balanceSummary = await BalanceAccount_1.default.aggregate([
                    { $match: { userId } },
                    { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
                ]).session(session);
                const available = balanceSummary[0]?.totalAmount ?? 0;
                if (amount > available) {
                    throw new Error("Insufficient balance to fund the personal loan.");
                }
                await allocateAmountAcrossBalances(userId, amount, session);
            }
            loan = await Loan_1.default.create([
                {
                    userId,
                    borrower: borrower.trim(),
                    amount,
                    remainingAmount: amount,
                    sourceType,
                    status: "ACTIVE",
                },
            ], { session });
            await LoanLedger_1.default.create([
                {
                    loanId: loan[0]._id.toString(),
                    type: "DISBURSEMENT",
                    amount,
                },
            ], { session });
            if (sourceType === "BORROWED") {
                await ExternalDebt_1.default.findOneAndUpdate({
                    userId,
                    creditor: creditor.trim(),
                }, {
                    userId,
                    creditor: creditor.trim(),
                    $inc: { totalAmount: amount, remainingAmount: amount },
                }, {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,
                    session,
                });
            }
            await TransactionLedger_1.default.create([
                {
                    userId,
                    type: "DEBIT",
                    source: "LOAN_GIVEN",
                    amount,
                    referenceId: loan[0]._id.toString(),
                },
            ], { session });
            await recalculateTotalBalance(userId, session);
        });
        return loan[0];
    }
    finally {
        session.endSession();
    }
}
async function repayLoan(userId, loanId, amount, creditor) {
    if (amount <= 0) {
        throw new Error("Repayment amount must be greater than zero.");
    }
    const session = await mongoose_1.default.startSession();
    try {
        let updatedLoan;
        await session.withTransaction(async () => {
            const loan = await Loan_1.default.findOne({ _id: loanId, userId }).session(session);
            if (!loan) {
                throw new Error("Loan not found.");
            }
            if (amount > loan.remainingAmount) {
                throw new Error("Repayment cannot exceed the remaining loan balance.");
            }
            loan.remainingAmount -= amount;
            loan.status = loan.remainingAmount === 0 ? "CLOSED" : "PARTIAL";
            await loan.save({ session });
            await LoanLedger_1.default.create([
                {
                    loanId: loan._id.toString(),
                    type: "REPAYMENT",
                    amount,
                },
            ], { session });
            if (loan.sourceType === "PERSONAL") {
                const cashEntry = await BalanceAccount_1.default.findOneAndUpdate({ userId, type: "CASH" }, { $inc: { amount } }, { new: true, upsert: true, setDefaultsOnInsert: true, session });
                if (!cashEntry) {
                    throw new Error("Failed to credit loan repayment to cash balance.");
                }
            }
            else {
                const debtCreditor = creditor?.trim();
                if (!debtCreditor) {
                    throw new Error("Creditor is required to repay borrowed debt.");
                }
                const debt = await ExternalDebt_1.default.findOne({
                    userId,
                    creditor: debtCreditor,
                }).session(session);
                if (!debt) {
                    throw new Error("External debt record not found for this creditor.");
                }
                if (amount > debt.remainingAmount) {
                    throw new Error("Repayment cannot exceed the remaining external debt.");
                }
                debt.remainingAmount -= amount;
                await debt.save({ session });
            }
            await TransactionLedger_1.default.create([
                {
                    userId,
                    type: "CREDIT",
                    source: "LOAN_REPAID",
                    amount,
                    referenceId: loan._id.toString(),
                },
            ], { session });
            await recalculateTotalBalance(userId, session);
            updatedLoan = loan;
        });
        return updatedLoan;
    }
    finally {
        session.endSession();
    }
}
async function getLoans(userId, filters) {
    const query = { userId };
    if (filters.status) {
        query.status = filters.status.toUpperCase();
    }
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const skip = (page - 1) * limit;
    const [loans, total] = await Promise.all([
        Loan_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Loan_1.default.countDocuments(query),
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
async function getDebts(userId) {
    const debts = await ExternalDebt_1.default.find({ userId }).sort({ updatedAt: -1 });
    return debts;
}
async function getSummary(userId) {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [balanceStats, expenseStats, currentMonthStats, loanStats, totalDebt] = await Promise.all([
        BalanceAccount_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
        ]),
        Expense_1.default.aggregate([
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
        Expense_1.default.aggregate([
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
        Loan_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, totalLoans: { $sum: "$amount" } } },
        ]),
        ExternalDebt_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, totalDebt: { $sum: "$remainingAmount" } } },
        ]),
    ]);
    const totalBalance = balanceStats[0]?.totalAmount ?? 0;
    const totalExpenses = expenseStats[0]?.totalExpenses ?? 0;
    const averageExpense = Math.round((expenseStats[0]?.averageExpense ?? 0) * 100) / 100;
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
