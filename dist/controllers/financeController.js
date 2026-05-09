"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSavings = exports.addIncome = exports.getFinanceInsights = exports.getFinanceSummary = exports.getDebtList = exports.getLoanList = exports.repayLoanEntry = exports.createLoanEntry = exports.getSalaryHistoryList = exports.getCurrentSalary = exports.addSalaryEntry = exports.getMonthlyExpenseSummary = exports.deleteExpenseEntry = exports.updateExpenseEntry = exports.getExpensesList = exports.addExpense = exports.deleteCategory = exports.getCategories = exports.createCategory = exports.getBalance = exports.deleteBalance = exports.updateBalance = exports.addBalance = void 0;
const Category_1 = __importDefault(require("../models/Category"));
const Expense_1 = __importDefault(require("../models/Expense"));
const BalanceAccount_1 = require("../models/BalanceAccount");
const financeService_1 = require("../services/financeService");
const financeUtils_1 = require("../utils/financeUtils");
function getErrorMessage(error) {
    return error instanceof Error ? error.message : "Server error";
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
function normalizeOptionalText(value) {
    return typeof value === "string" ? value.trim() : "";
}
const addBalance = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { type, amount } = req.body;
    if (!type ||
        typeof type !== "string" ||
        !BalanceAccount_1.BALANCE_ACCOUNT_TYPES.includes(type)) {
        return res.status(400).json({
            success: false,
            message: `Balance source type must be one of: ${BalanceAccount_1.BALANCE_ACCOUNT_TYPES.join(", ")}.`,
        });
    }
    if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: "Amount must be a positive number.",
        });
    }
    try {
        const account = await (0, financeService_1.addBalanceSource)(auth.userId, type, amount);
        return res.status(201).json({
            success: true,
            message: "Balance source added successfully.",
            data: account,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.addBalance = addBalance;
const updateBalance = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { amount } = req.body;
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
        const updated = await (0, financeService_1.updateBalanceSource)(id, amount);
        return res.status(200).json({
            success: true,
            message: "Balance source updated successfully.",
            data: updated,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.updateBalance = updateBalance;
const deleteBalance = async (req, res) => {
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
        const deleted = await (0, financeService_1.deleteBalanceSource)(id);
        return res.status(200).json({
            success: true,
            message: "Balance source deleted successfully.",
            data: deleted,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.deleteBalance = deleteBalance;
const getBalance = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    try {
        const balance = await (0, financeService_1.getBalanceSources)(auth.userId);
        return res.status(200).json({
            success: true,
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
exports.getBalance = getBalance;
const createCategory = async (req, res) => {
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
        const normalized = (0, financeUtils_1.normalizeCategoryName)(name);
        const category = await Category_1.default.findOneAndUpdate({ userId: auth.userId, name: normalized }, { userId: auth.userId, name: normalized }, { new: true, upsert: true, setDefaultsOnInsert: true });
        return res.status(200).json({
            success: true,
            message: "Category saved successfully.",
            data: {
                ...(category?.toObject ? category.toObject() : category),
                label: (0, financeUtils_1.formatCategoryLabel)(normalized),
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
exports.createCategory = createCategory;
const getCategories = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    try {
        const categories = await Category_1.default.find({ userId: auth.userId }).sort({
            name: 1,
        });
        return res.status(200).json({
            success: true,
            data: categories.map((category) => ({
                ...category.toObject(),
                label: (0, financeUtils_1.formatCategoryLabel)(category.name),
            })),
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
        return res
            .status(400)
            .json({ success: false, message: "Category name is required." });
    }
    try {
        const normalized = (0, financeUtils_1.normalizeCategoryName)(categoryName);
        const expenseCount = await Expense_1.default.countDocuments({
            userId: auth.userId,
            category: normalized,
        });
        if (expenseCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete a category in use. Remove or reassign related entries first.",
            });
        }
        const deleted = await Category_1.default.findOneAndDelete({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error),
        });
    }
};
exports.deleteCategory = deleteCategory;
const addExpense = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { amount, category, note, date } = req.body;
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
    const expenseDate = date ? new Date(date) : new Date();
    if (Number.isNaN(expenseDate.getTime())) {
        return res
            .status(400)
            .json({ success: false, message: "Expense date is invalid." });
    }
    try {
        const normalizedCategory = (0, financeUtils_1.normalizeCategoryName)(category);
        const existingCategory = await Category_1.default.findOne({
            userId: auth.userId,
            name: normalizedCategory,
        });
        if (!existingCategory) {
            return res
                .status(400)
                .json({ success: false, message: "Category does not exist." });
        }
        const expense = await (0, financeService_1.createExpense)(auth.userId, amount, normalizedCategory, normalizeOptionalText(note), expenseDate);
        return res.status(201).json({
            success: true,
            message: "Expense created successfully.",
            data: expense,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.addExpense = addExpense;
const getExpensesList = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    try {
        const result = await (0, financeService_1.getExpenses)(auth.userId, {
            page,
            limit,
            category,
            startDate,
            endDate,
        });
        const expenses = result.expenses.map((expense) => ({
            ...expense.toObject({ virtuals: true }),
            categoryLabel: (0, financeUtils_1.formatCategoryLabel)(expense.category),
        }));
        return res.status(200).json({
            success: true,
            data: expenses,
            pagination: result.pagination,
        });
    }
    catch (error) {
        return res
            .status(500)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.getExpensesList = getExpensesList;
const updateExpenseEntry = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { amount, category, note, date } = req.body;
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
    const expenseDate = date ? new Date(date) : new Date();
    if (Number.isNaN(expenseDate.getTime())) {
        return res
            .status(400)
            .json({ success: false, message: "Expense date is invalid." });
    }
    try {
        const updated = await (0, financeService_1.updateExpense)(auth.userId, id, amount, (0, financeUtils_1.normalizeCategoryName)(category), normalizeOptionalText(note), expenseDate);
        return res.status(200).json({
            success: true,
            message: "Expense updated successfully.",
            data: updated,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.updateExpenseEntry = updateExpenseEntry;
const deleteExpenseEntry = async (req, res) => {
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
        const deleted = await (0, financeService_1.deleteExpense)(auth.userId, id);
        return res.status(200).json({
            success: true,
            message: "Expense deleted successfully.",
            data: deleted,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.deleteExpenseEntry = deleteExpenseEntry;
const getMonthlyExpenseSummary = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    try {
        const summary = await (0, financeService_1.getMonthlyExpenseSummary)(auth.userId, year, month);
        return res.status(200).json({ success: true, data: summary });
    }
    catch (error) {
        return res
            .status(500)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.getMonthlyExpenseSummary = getMonthlyExpenseSummary;
const addSalaryEntry = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { amount, date } = req.body;
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
        const salary = await (0, financeService_1.addSalary)(auth.userId, amount, salaryDate);
        return res.status(201).json({
            success: true,
            message: "Salary added successfully.",
            data: salary,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.addSalaryEntry = addSalaryEntry;
const getCurrentSalary = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    try {
        const salary = await (0, financeService_1.getCurrentSalaryMonth)(auth.userId);
        return res.status(200).json({ success: true, data: salary });
    }
    catch (error) {
        return res
            .status(500)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.getCurrentSalary = getCurrentSalary;
const getSalaryHistoryList = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    try {
        const result = await (0, financeService_1.getSalaryHistory)(auth.userId, page, limit);
        return res.status(200).json({
            success: true,
            data: result.history,
            pagination: result.pagination,
        });
    }
    catch (error) {
        return res
            .status(500)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.getSalaryHistoryList = getSalaryHistoryList;
const createLoanEntry = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { borrower, amount, sourceType, creditor } = req.body;
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
        const loan = await (0, financeService_1.createLoan)(auth.userId, borrower, amount, sourceType, creditor);
        return res.status(201).json({
            success: true,
            message: "Loan created successfully.",
            data: loan,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.createLoanEntry = createLoanEntry;
const repayLoanEntry = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const loanId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
    const { amount, creditor } = req.body;
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
        const loan = await (0, financeService_1.repayLoan)(auth.userId, loanId, amount, creditorValue);
        return res.status(200).json({
            success: true,
            message: "Loan repayment recorded successfully.",
            data: loan,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.repayLoanEntry = repayLoanEntry;
const getLoanList = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    try {
        const result = await (0, financeService_1.getLoans)(auth.userId, { status, page, limit });
        return res.status(200).json({
            success: true,
            data: result.loans,
            pagination: result.pagination,
        });
    }
    catch (error) {
        return res
            .status(500)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.getLoanList = getLoanList;
const getDebtList = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    try {
        const debts = await (0, financeService_1.getDebts)(auth.userId);
        return res.status(200).json({ success: true, data: debts });
    }
    catch (error) {
        return res
            .status(500)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.getDebtList = getDebtList;
const getFinanceSummary = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    if (month !== undefined || year !== undefined) {
        if (month === undefined ||
            year === undefined ||
            !Number.isInteger(month) ||
            month < 1 ||
            month > 12 ||
            !Number.isInteger(year) ||
            year < 1900) {
            return res.status(400).json({
                success: false,
                message: "Both month (1–12) and year must be provided together.",
            });
        }
        try {
            const summary = await (0, financeService_1.getSummaryForMonth)(auth.userId, month, year);
            return res.status(200).json({ success: true, data: summary });
        }
        catch (error) {
            return res
                .status(500)
                .json({ success: false, message: getErrorMessage(error) });
        }
    }
    try {
        const summary = await (0, financeService_1.getSummary)(auth.userId);
        return res.status(200).json({ success: true, data: summary });
    }
    catch (error) {
        return res
            .status(500)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.getFinanceSummary = getFinanceSummary;
const getFinanceInsights = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    try {
        const insights = await (0, financeService_1.getInsights)(auth.userId, year, month);
        return res.status(200).json({ success: true, data: insights });
    }
    catch (error) {
        return res
            .status(500)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.getFinanceInsights = getFinanceInsights;
const addIncome = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { amount, source, note, date } = req.body;
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
    const incomeDate = date ? new Date(date) : new Date();
    if (Number.isNaN(incomeDate.getTime())) {
        return res
            .status(400)
            .json({ success: false, message: "Income date is invalid." });
    }
    try {
        const income = await (0, financeService_1.createIncomeRecord)(auth.userId, amount, source.trim(), normalizeOptionalText(note), incomeDate);
        return res.status(201).json({
            success: true,
            message: "Income recorded successfully.",
            data: income,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.addIncome = addIncome;
const addSavings = async (req, res) => {
    const auth = getAuthorizedUserId(req);
    if ("error" in auth) {
        return res
            .status(auth.status)
            .json({ success: false, message: auth.error });
    }
    const { amount, sourceName, note, date } = req.body;
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
    const savingsDate = date ? new Date(date) : new Date();
    if (Number.isNaN(savingsDate.getTime())) {
        return res
            .status(400)
            .json({ success: false, message: "Savings date is invalid." });
    }
    try {
        const savings = await (0, financeService_1.createSavingsRecord)(auth.userId, amount, sourceName.trim(), normalizeOptionalText(note), savingsDate);
        return res.status(201).json({
            success: true,
            message: "Savings recorded successfully.",
            data: savings,
        });
    }
    catch (error) {
        return res
            .status(400)
            .json({ success: false, message: getErrorMessage(error) });
    }
};
exports.addSavings = addSavings;
