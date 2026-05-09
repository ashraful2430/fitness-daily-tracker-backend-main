"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinanceSummary = exports.deleteLending = exports.repayLending = exports.getLendings = exports.createLending = exports.deleteLoan = exports.payLoan = exports.getLoans = exports.createLoan = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const LoanDebt_1 = __importStar(require("../models/LoanDebt"));
const Lending_1 = __importDefault(require("../models/Lending"));
const BalanceAccount_1 = __importDefault(require("../models/BalanceAccount"));
const BalanceRecord_1 = __importDefault(require("../models/BalanceRecord"));
const TransactionLedger_1 = __importDefault(require("../models/TransactionLedger"));
const apiMessages_1 = require("../utils/apiMessages");
// ─── Errors ───────────────────────────────────────────────────────────────────
class ApiError extends Error {
    constructor(statusCode, message, field) {
        super(message);
        this.statusCode = statusCode;
        this.field = field;
    }
}
function sendError(res, status, message, field) {
    const body = { message };
    if (field)
        body.field = field;
    return res.status(status).json(body);
}
function handleError(res, e) {
    if (e instanceof ApiError) {
        return sendError(res, e.statusCode, e.message, e.field);
    }
    return sendError(res, 500, (0, apiMessages_1.errorMessage)("server"));
}
function resolveId(param) {
    return Array.isArray(param) ? param[0] : param;
}
function normalizeOptionalText(value) {
    return typeof value === "string" ? value.trim() : "";
}
function normalizeLoanReason(value) {
    const reason = normalizeOptionalText(value);
    return reason || LoanDebt_1.DEFAULT_LOAN_REASON;
}
// ─── Balance helpers ──────────────────────────────────────────────────────────
const BALANCE_PRIORITY = ["SALARY", "CASH", "BANK", "EXTERNAL"];
async function getAvailableBalance(userId, session) {
    const agg = BalanceAccount_1.default.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    if (session)
        agg.session(session);
    const result = await agg;
    return result[0]?.total ?? 0;
}
async function deductFromBalance(userId, amount, session) {
    const accounts = await BalanceAccount_1.default.find({ userId }).session(session);
    accounts.sort((a, b) => BALANCE_PRIORITY.indexOf(a.type) - BALANCE_PRIORITY.indexOf(b.type));
    let remaining = amount;
    for (const account of accounts) {
        if (remaining <= 0)
            break;
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
        throw new ApiError(400, "Insufficient balance.", "amount");
    }
}
async function creditCashBalance(userId, amount, session) {
    await BalanceAccount_1.default.findOneAndUpdate({ userId, type: "CASH" }, { $inc: { amount } }, { new: true, upsert: true, setDefaultsOnInsert: true, session });
}
// ─── Loans ────────────────────────────────────────────────────────────────────
const createLoan = async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return sendError(res, 401, (0, apiMessages_1.errorMessage)("unauthorized"));
    const { personName, amount, reason, date } = req.body;
    if (!personName?.trim())
        return sendError(res, 400, "personName is required. Who handed you the cash?", "personName");
    if (typeof amount !== "number" || amount <= 0)
        return sendError(res, 400, (0, apiMessages_1.errorMessage)("invalidAmount"), "amount");
    const loanDate = date ? new Date(date) : new Date();
    if (isNaN(loanDate.getTime()))
        return sendError(res, 400, (0, apiMessages_1.errorMessage)("invalidDate"), "date");
    const session = await mongoose_1.default.startSession();
    try {
        let loan;
        await session.withTransaction(async () => {
            const docs = await LoanDebt_1.default.create([
                {
                    userId,
                    personName: personName.trim(),
                    amount,
                    reason: normalizeLoanReason(reason),
                    date: loanDate,
                },
            ], { session });
            loan = docs[0];
            await BalanceAccount_1.default.create([{ userId, type: "EXTERNAL", amount }], { session });
            await TransactionLedger_1.default.create([
                {
                    userId,
                    type: "CREDIT",
                    source: "LOAN_RECEIVED",
                    amount,
                    referenceId: loan._id.toString(),
                },
            ], { session });
            const agg = await BalanceAccount_1.default.aggregate([
                { $match: { userId } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]).session(session);
            const total = agg[0]?.total ?? 0;
            await BalanceRecord_1.default.findOneAndUpdate({ userId }, { userId, amount: total }, { new: true, upsert: true, setDefaultsOnInsert: true, session });
        });
        return res.status(201).json({
            success: true,
            message: (0, apiMessages_1.successMessage)("created", "loan-debt-created"),
            data: loan,
        });
    }
    catch (e) {
        return handleError(res, e);
    }
    finally {
        session.endSession();
    }
};
exports.createLoan = createLoan;
const getLoans = async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return sendError(res, 401, (0, apiMessages_1.errorMessage)("unauthorized"));
    try {
        const loans = await LoanDebt_1.default.find({ userId }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: loans });
    }
    catch (e) {
        return handleError(res, e);
    }
};
exports.getLoans = getLoans;
const payLoan = async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return sendError(res, 401, (0, apiMessages_1.errorMessage)("unauthorized"));
    const loanId = resolveId(req.params.id);
    const { amount } = req.body;
    if (typeof amount !== "number" || amount <= 0)
        return sendError(res, 400, (0, apiMessages_1.errorMessage)("invalidAmount"), "amount");
    try {
        const loan = await LoanDebt_1.default.findOne({ _id: loanId, userId });
        if (!loan)
            return sendError(res, 404, (0, apiMessages_1.errorMessage)("notFound"));
        if (loan.status === "PAID")
            return sendError(res, 400, "Loan is already paid. Stop trying to pay a ghost bill.");
        const remaining = loan.amount - loan.paidAmount;
        if (amount > remaining)
            return sendError(res, 400, `Amount exceeds remaining balance of ${remaining}`, "amount");
        loan.paidAmount += amount;
        if (loan.paidAmount >= loan.amount) {
            loan.paidAmount = loan.amount;
            loan.status = "PAID";
        }
        else {
            loan.status = "PARTIALLY_PAID";
        }
        await loan.save();
        return res.status(200).json({
            success: true,
            message: (0, apiMessages_1.successMessage)("updated", "loan-debt-paid"),
            data: loan,
        });
    }
    catch (e) {
        return handleError(res, e);
    }
};
exports.payLoan = payLoan;
const deleteLoan = async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return sendError(res, 401, (0, apiMessages_1.errorMessage)("unauthorized"));
    const loanId = resolveId(req.params.id);
    try {
        const loan = await LoanDebt_1.default.findOne({ _id: loanId, userId });
        if (!loan)
            return sendError(res, 404, (0, apiMessages_1.errorMessage)("notFound"));
        if (loan.linkedLendingId) {
            return sendError(res, 400, "This loan was auto-created by a lending entry. Delete the lending instead.");
        }
        await LoanDebt_1.default.deleteOne({ _id: loanId });
        return res.status(200).json({
            success: true,
            message: (0, apiMessages_1.successMessage)("deleted", "loan-debt-deleted"),
        });
    }
    catch (e) {
        return handleError(res, e);
    }
};
exports.deleteLoan = deleteLoan;
// ─── Lending ──────────────────────────────────────────────────────────────────
const createLending = async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return sendError(res, 401, (0, apiMessages_1.errorMessage)("unauthorized"));
    const { personName, amount, fundingSource, date } = req.body;
    if (!personName?.trim())
        return sendError(res, 400, "personName is required. Lending to 'someone' is how chaos gets receipts.", "personName");
    if (typeof amount !== "number" || amount <= 0)
        return sendError(res, 400, (0, apiMessages_1.errorMessage)("invalidAmount"), "amount");
    if (!fundingSource || !["PERSONAL", "BORROWED"].includes(fundingSource))
        return sendError(res, 400, "fundingSource must be PERSONAL or BORROWED", "fundingSource");
    const lendingDate = date ? new Date(date) : new Date();
    if (isNaN(lendingDate.getTime()))
        return sendError(res, 400, (0, apiMessages_1.errorMessage)("invalidDate"), "date");
    const session = await mongoose_1.default.startSession();
    try {
        let lending;
        await session.withTransaction(async () => {
            if (fundingSource === "PERSONAL") {
                const available = await getAvailableBalance(userId, session);
                if (amount > available) {
                    throw new ApiError(400, `Insufficient balance. Available: ${available}. Wallet said sit down.`, "amount");
                }
                await deductFromBalance(userId, amount, session);
                const docs = await Lending_1.default.create([
                    {
                        userId,
                        personName: personName.trim(),
                        amount,
                        fundingSource: "PERSONAL",
                        date: lendingDate,
                    },
                ], { session });
                lending = docs[0];
            }
            else {
                // BORROWED: auto-create a Loan record to track the debt
                const loanDocs = await LoanDebt_1.default.create([
                    {
                        userId,
                        personName: `Borrowed to lend to ${personName.trim()}`,
                        amount,
                        reason: `Borrowed funds to lend to ${personName.trim()}`,
                        date: lendingDate,
                        status: "ACTIVE",
                    },
                ], { session });
                const autoLoan = loanDocs[0];
                const lendingDocs = await Lending_1.default.create([
                    {
                        userId,
                        personName: personName.trim(),
                        amount,
                        fundingSource: "BORROWED",
                        date: lendingDate,
                        linkedLoanId: autoLoan._id.toString(),
                    },
                ], { session });
                lending = lendingDocs[0];
                // Back-link the auto-loan to the lending
                await LoanDebt_1.default.findOneAndUpdate({ _id: autoLoan._id }, { linkedLendingId: lending._id.toString() }, { session });
            }
        });
        return res.status(201).json({
            success: true,
            message: (0, apiMessages_1.successMessage)("created", "lending-created"),
            data: lending,
        });
    }
    catch (e) {
        return handleError(res, e);
    }
    finally {
        session.endSession();
    }
};
exports.createLending = createLending;
const getLendings = async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return sendError(res, 401, (0, apiMessages_1.errorMessage)("unauthorized"));
    try {
        const lendings = await Lending_1.default.find({ userId }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: lendings });
    }
    catch (e) {
        return handleError(res, e);
    }
};
exports.getLendings = getLendings;
const repayLending = async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return sendError(res, 401, (0, apiMessages_1.errorMessage)("unauthorized"));
    const lendingId = resolveId(req.params.id);
    const { amount } = req.body;
    if (typeof amount !== "number" || amount <= 0)
        return sendError(res, 400, (0, apiMessages_1.errorMessage)("invalidAmount"), "amount");
    const session = await mongoose_1.default.startSession();
    try {
        let lending;
        await session.withTransaction(async () => {
            lending = await Lending_1.default.findOne({ _id: lendingId, userId }).session(session);
            if (!lending)
                throw new ApiError(404, (0, apiMessages_1.errorMessage)("notFound"));
            if (lending.status === "REPAID")
                throw new ApiError(400, "Lending is already repaid. Victory lap denied.");
            const remaining = lending.amount - lending.repaidAmount;
            if (amount > remaining)
                throw new ApiError(400, `Amount exceeds remaining balance of ${remaining}`, "amount");
            lending.repaidAmount += amount;
            const fullyRepaid = lending.repaidAmount >= lending.amount;
            if (fullyRepaid) {
                lending.repaidAmount = lending.amount;
                lending.status = "REPAID";
            }
            else {
                lending.status = "PARTIALLY_REPAID";
            }
            await lending.save({ session });
            if (fullyRepaid) {
                if (lending.fundingSource === "PERSONAL") {
                    await creditCashBalance(userId, lending.amount, session);
                }
                else if (lending.fundingSource === "BORROWED" && lending.linkedLoanId) {
                    await LoanDebt_1.default.findOneAndUpdate({ _id: lending.linkedLoanId, userId }, { status: "PAID", paidAmount: lending.amount }, { session });
                }
            }
            else if (lending.fundingSource === "PERSONAL") {
                await creditCashBalance(userId, amount, session);
            }
        });
        return res.status(200).json({
            success: true,
            message: (0, apiMessages_1.successMessage)("updated", "lending-repaid"),
            data: lending,
        });
    }
    catch (e) {
        return handleError(res, e);
    }
    finally {
        session.endSession();
    }
};
exports.repayLending = repayLending;
const deleteLending = async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return sendError(res, 401, (0, apiMessages_1.errorMessage)("unauthorized"));
    const lendingId = resolveId(req.params.id);
    const session = await mongoose_1.default.startSession();
    try {
        await session.withTransaction(async () => {
            const lending = await Lending_1.default.findOne({ _id: lendingId, userId }).session(session);
            if (!lending)
                throw new ApiError(404, (0, apiMessages_1.errorMessage)("notFound"));
            const isOpen = lending.status === "ACTIVE" || lending.status === "PARTIALLY_REPAID";
            if (isOpen) {
                if (lending.fundingSource === "PERSONAL") {
                    // Refund only the portion not yet returned
                    const unreturned = lending.amount - lending.repaidAmount;
                    if (unreturned > 0)
                        await creditCashBalance(userId, unreturned, session);
                }
                else if (lending.fundingSource === "BORROWED" && lending.linkedLoanId) {
                    await LoanDebt_1.default.findOneAndDelete({
                        _id: lending.linkedLoanId,
                        userId,
                    }).session(session);
                }
            }
            await Lending_1.default.findByIdAndDelete(lendingId).session(session);
        });
        return res
            .status(200)
            .json({
            success: true,
            message: (0, apiMessages_1.successMessage)("deleted", "lending-deleted"),
        });
    }
    catch (e) {
        return handleError(res, e);
    }
    finally {
        session.endSession();
    }
};
exports.deleteLending = deleteLending;
// ─── Finance Summary ──────────────────────────────────────────────────────────
const getFinanceSummary = async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return sendError(res, 401, (0, apiMessages_1.errorMessage)("unauthorized"));
    try {
        const [balanceResult, loanResult, lendingResult] = await Promise.all([
            BalanceAccount_1.default.aggregate([
                { $match: { userId } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
            LoanDebt_1.default.aggregate([
                { $match: { userId, status: { $in: ["ACTIVE", "PARTIALLY_PAID"] } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $subtract: ["$amount", "$paidAmount"] } },
                    },
                },
            ]),
            Lending_1.default.aggregate([
                { $match: { userId, status: { $in: ["ACTIVE", "PARTIALLY_REPAID"] } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $subtract: ["$amount", "$repaidAmount"] } },
                    },
                },
            ]),
        ]);
        const availableBalance = balanceResult[0]?.total ?? 0;
        const totalLoanDebt = loanResult[0]?.total ?? 0;
        const totalLending = lendingResult[0]?.total ?? 0;
        const netBalance = availableBalance - totalLoanDebt + totalLending;
        return res.status(200).json({
            success: true,
            data: { availableBalance, totalLoanDebt, totalLending, netBalance },
        });
    }
    catch (e) {
        return handleError(res, e);
    }
};
exports.getFinanceSummary = getFinanceSummary;
