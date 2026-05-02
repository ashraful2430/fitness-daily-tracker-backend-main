"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMostSpentCategory = exports.getMoneySummary = exports.getExpenses = exports.clearBalance = exports.upsertBalance = exports.getBalance = exports.getSalary = exports.getLoans = exports.deleteLoan = exports.payLoan = exports.updateLoan = exports.createLoan = exports.deleteExpense = exports.updateExpense = exports.addExpense = exports.resetSalary = exports.upsertSalary = exports.deleteCategory = exports.getCategories = exports.createCategory = void 0;
const Expense_1 = __importDefault(require("../models/Expense"));
const Category_1 = __importDefault(require("../models/Category"));
const Salary_1 = __importDefault(require("../models/Salary"));
const MoneyState_1 = __importDefault(require("../models/MoneyState"));
const BalanceRecord_1 = __importDefault(require("../models/BalanceRecord"));
const Loan_1 = __importDefault(require("../models/Loan"));
function getErrorMessage(error) {
    return error instanceof Error ? error.message : "Server error";
}
function normalizeCategoryName(name) {
    return name.trim().toLowerCase();
}
function getMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
async function ensureMonthlyExpenseReset(userId) {
    const currentMonthKey = getMonthKey();
    const moneyState = await MoneyState_1.default.findOne({ userId });
    if (!moneyState) {
        await MoneyState_1.default.create({
            userId,
            lastExpenseResetMonth: currentMonthKey,
        });
        return;
    }
    if (moneyState.lastExpenseResetMonth === currentMonthKey) {
        return;
    }
    await Expense_1.default.deleteMany({ userId });
    moneyState.lastExpenseResetMonth = currentMonthKey;
    await moneyState.save();
}
async function getAvailableBalance(userId) {
    return BalanceRecord_1.default.findOne({ userId });
}
async function setAvailableBalance(userId, amount) {
    return BalanceRecord_1.default.findOneAndUpdate({ userId }, { userId, amount }, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
    });
}
async function clearAvailableBalance(userId) {
    return BalanceRecord_1.default.findOneAndDelete({ userId });
}
async function adjustAvailableBalance(userId, delta) {
    return BalanceRecord_1.default.findOneAndUpdate({ userId }, { userId, $inc: { amount: delta } }, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
    });
}
function buildLoanSummary(userId) {
    return Loan_1.default.aggregate([
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
function parseOptionalPositiveInteger(value, fallback) {
    if (typeof value !== "string" || !value.trim()) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
}
function buildExpenseDateRange(startDate, endDate) {
    if (!startDate && !endDate) {
        return { range: undefined };
    }
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    if ((start && Number.isNaN(start.getTime())) ||
        (end && Number.isNaN(end.getTime()))) {
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
    const range = {};
    if (start) {
        range.$gte = start;
    }
    if (end) {
        range.$lte = end;
    }
    return { range };
}
function getAuthorizedUserId(req, requestedUserId) {
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
const createCategory = async (req, res) => {
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
        const newCategory = await Category_1.default.findOneAndUpdate({ userId: auth.userId, name: normalizedName }, { userId: auth.userId, name: normalizedName }, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        });
        return res.status(200).json({
            success: true,
            message: "Category saved successfully.",
            data: newCategory,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.createCategory = createCategory;
const getCategories = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    try {
        await ensureMonthlyExpenseReset(auth.userId);
        const categories = await Category_1.default.find({ userId: auth.userId }).sort({
            name: 1,
        });
        return res.status(200).json({
            success: true,
            data: categories,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.getCategories = getCategories;
const deleteCategory = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const categoryName = typeof req.params.name === "string" ? req.params.name.trim() : "";
    if (!categoryName) {
        return res.status(400).json({
            success: false,
            message: "Category name is required.",
        });
    }
    try {
        await ensureMonthlyExpenseReset(auth.userId);
        const normalizedName = normalizeCategoryName(categoryName);
        const expenseCount = await Expense_1.default.countDocuments({
            userId: auth.userId,
            category: normalizedName,
        });
        if (expenseCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete a category that is already used by expenses. Remove or reassign those expenses first.",
            });
        }
        const deletedCategory = await Category_1.default.findOneAndDelete({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.deleteCategory = deleteCategory;
// Create or update salary
const upsertSalary = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { amount } = req.body;
    if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
        return res.status(400).json({
            success: false,
            message: "A valid salary amount is required.",
        });
    }
    try {
        await ensureMonthlyExpenseReset(auth.userId);
        const salary = await Salary_1.default.findOneAndUpdate({ userId: auth.userId }, { userId: auth.userId, amount }, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        });
        return res.status(200).json({
            success: true,
            message: "Salary saved successfully.",
            data: salary,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.upsertSalary = upsertSalary;
const resetSalary = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    try {
        await ensureMonthlyExpenseReset(auth.userId);
        const deletedSalary = await Salary_1.default.findOneAndDelete({
            userId: auth.userId,
        });
        return res.status(200).json({
            success: true,
            message: deletedSalary
                ? "Salary reset successfully."
                : "Salary was already empty.",
            data: null,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.resetSalary = resetSalary;
// Add an expense
const addExpense = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { amount, description, category, date } = req.body;
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
        const existingCategory = await Category_1.default.findOne({
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
        const newExpense = new Expense_1.default({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.addExpense = addExpense;
const updateExpense = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { amount, description, category, date } = req.body;
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
        const existingCategory = await Category_1.default.findOne({
            userId: auth.userId,
            name: normalizedCategory,
        });
        if (!existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Category does not exist for this user.",
            });
        }
        const existingExpense = await Expense_1.default.findOne({
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
        const updatedExpense = await Expense_1.default.findOneAndUpdate({
            _id: req.params.id,
            userId: auth.userId,
        }, {
            amount,
            description: description.trim(),
            category: normalizedCategory,
            date: expenseDate,
        }, {
            new: true,
            runValidators: true,
        });
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.updateExpense = updateExpense;
const deleteExpense = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    try {
        await ensureMonthlyExpenseReset(auth.userId);
        const deletedExpense = await Expense_1.default.findOneAndDelete({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.deleteExpense = deleteExpense;
const createLoan = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { lender, reason, amount, date } = req.body;
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
        const loan = await Loan_1.default.create({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.createLoan = createLoan;
const updateLoan = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { lender, reason, amount } = req.body;
    const loan = await Loan_1.default.findOne({ _id: req.params.id, userId: auth.userId });
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
        const updatedLoan = await Loan_1.default.findOneAndUpdate({ _id: req.params.id, userId: auth.userId }, {
            ...(lender ? { lender: lender.trim() } : {}),
            ...(reason ? { reason: reason.trim() } : {}),
            ...(amount !== undefined ? { amount } : {}),
        }, {
            new: true,
            runValidators: true,
        });
        return res.status(200).json({
            success: true,
            message: "Loan updated successfully.",
            data: updatedLoan,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.updateLoan = updateLoan;
const payLoan = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { amount } = req.body;
    const loan = await Loan_1.default.findOne({ _id: req.params.id, userId: auth.userId });
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
    const paymentAmount = amount === undefined
        ? remaining
        : typeof amount === "number"
            ? amount
            : NaN;
    if (typeof paymentAmount !== "number" ||
        Number.isNaN(paymentAmount) ||
        paymentAmount <= 0) {
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
        const updatedLoan = await Loan_1.default.findOneAndUpdate({ _id: req.params.id, userId: auth.userId }, {
            $inc: { paidAmount: paymentAmount },
            ...(paymentAmount === remaining
                ? { status: "paid", paidAt: new Date() }
                : {}),
        }, {
            new: true,
            runValidators: true,
        });
        await adjustAvailableBalance(auth.userId, -paymentAmount);
        return res.status(200).json({
            success: true,
            message: "Loan payment recorded successfully.",
            data: updatedLoan,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.payLoan = payLoan;
const deleteLoan = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const loan = await Loan_1.default.findOne({ _id: req.params.id, userId: auth.userId });
    if (!loan) {
        return res.status(404).json({
            success: false,
            message: "Loan not found.",
        });
    }
    if (loan.paidAmount > 0) {
        return res.status(409).json({
            success: false,
            message: "Cannot delete a loan that has already received a payment. Mark it paid or create a correction entry instead.",
        });
    }
    try {
        await Loan_1.default.deleteOne({ _id: req.params.id, userId: auth.userId });
        return res.status(200).json({
            success: true,
            message: "Loan deleted successfully.",
            data: null,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.deleteLoan = deleteLoan;
const getLoans = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const status = typeof req.query.status === "string" ? req.query.status.trim() : undefined;
    const page = parseOptionalPositiveInteger(req.query.page, 1);
    const limit = Math.min(parseOptionalPositiveInteger(req.query.limit, 50), 200);
    try {
        const query = {
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
            Loan_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Loan_1.default.countDocuments(query),
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.getLoans = getLoans;
// Get salary by userId
const getSalary = async (req, res) => {
    const requestedUserId = typeof req.params.userId === "string" ? req.params.userId : undefined;
    const auth = getAuthorizedUserId(req, requestedUserId);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    try {
        await ensureMonthlyExpenseReset(auth.userId);
        const salary = await Salary_1.default.findOne({ userId: auth.userId });
        return res.status(200).json({
            success: true,
            data: salary || null,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.getSalary = getSalary;
const getBalance = async (req, res) => {
    const requestedUserId = typeof req.params.userId === "string" ? req.params.userId : undefined;
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.getBalance = getBalance;
const upsertBalance = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { amount } = req.body;
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.upsertBalance = upsertBalance;
const clearBalance = async (req, res) => {
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.clearBalance = clearBalance;
// Get all expenses for a user (can be filtered by date for daily, weekly, monthly)
const getExpenses = async (req, res) => {
    const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const auth = getAuthorizedUserId(req, requestedUserId);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const page = parseOptionalPositiveInteger(req.query.page, 1);
    const limit = Math.min(parseOptionalPositiveInteger(req.query.limit, 20), 100);
    try {
        await ensureMonthlyExpenseReset(auth.userId);
        const query = {
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
            Expense_1.default.find(query)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Expense_1.default.countDocuments(query),
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.getExpenses = getExpenses;
const getMoneySummary = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
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
        const [salary, balance, filteredExpenseStats, categoryBreakdown, currentMonthSpent, loanSummary,] = await Promise.all([
            Salary_1.default.findOne({ userId: auth.userId }),
            getAvailableBalance(auth.userId),
            Expense_1.default.aggregate([
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
            Expense_1.default.aggregate([
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
            Expense_1.default.aggregate([
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
                averageExpense: Math.round((expenseStats.averageExpense ?? 0) * 100) / 100,
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.getMoneySummary = getMoneySummary;
// Get the category where a user spent the most
const getMostSpentCategory = async (req, res) => {
    const requestedUserId = typeof req.params.userId === "string" ? req.params.userId : undefined;
    const auth = getAuthorizedUserId(req, requestedUserId);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    try {
        await ensureMonthlyExpenseReset(auth.userId);
        const expenses = await Expense_1.default.aggregate([
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.getMostSpentCategory = getMostSpentCategory;
