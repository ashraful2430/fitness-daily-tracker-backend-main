"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outstanding = outstanding;
exports.buildCanonicalFinanceSummary = buildCanonicalFinanceSummary;
exports.getCanonicalFinanceSummary = getCanonicalFinanceSummary;
const BalanceAccount_1 = __importDefault(require("../models/BalanceAccount"));
const Expense_1 = __importDefault(require("../models/Expense"));
const Income_1 = __importDefault(require("../models/Income"));
const Lending_1 = __importDefault(require("../models/Lending"));
const LoanDebt_1 = __importDefault(require("../models/LoanDebt"));
const SalaryMonth_1 = __importDefault(require("../models/SalaryMonth"));
const Savings_1 = __importDefault(require("../models/Savings"));
function sumAggValue(result) {
    return result[0]?.total ?? 0;
}
function splitLoanBuckets(result) {
    const direct = result.find((item) => item._id === "DIRECT");
    const borrowed = result.find((item) => item._id === "BORROWED_LENDING");
    return {
        direct: {
            principal: direct?.principal ?? 0,
            repaid: direct?.repaid ?? 0,
        },
        borrowed: {
            principal: borrowed?.principal ?? 0,
            repaid: borrowed?.repaid ?? 0,
        },
    };
}
function splitLendingBuckets(result) {
    const personal = result.find((item) => item._id === "PERSONAL");
    const borrowed = result.find((item) => item._id === "BORROWED");
    return {
        personal: {
            principal: personal?.principal ?? 0,
            repaid: personal?.repaid ?? 0,
        },
        borrowed: {
            principal: borrowed?.principal ?? 0,
            repaid: borrowed?.repaid ?? 0,
        },
    };
}
function outstanding({ principal, repaid }) {
    return Math.max(principal - repaid, 0);
}
function buildCanonicalFinanceSummary({ salary, externalIncome, savings, expenses, directLoans, borrowedLendingLoans, personalLending, borrowedLending: borrowedLendingRecords, balanceAccountTotal, }) {
    // Canonical debt source:
    // BORROWED lending creates a linked LoanDebt. To avoid double-counting, loan
    // debt is calculated from LoanDebt only, split by linkedLendingId for reporting.
    // The top-level activeLoans and borrowedLending values are outstanding amounts
    // after repayments so availableBalance and loanDebt stay synchronized.
    const activeLoans = outstanding(directLoans);
    const borrowedLending = outstanding(borrowedLendingLoans);
    const repaidLoans = directLoans.repaid + borrowedLendingLoans.repaid;
    const lendingFromPersonal = outstanding(personalLending);
    const borrowedLendingOutstanding = outstanding(borrowedLendingRecords);
    const lendingOutstanding = lendingFromPersonal + borrowedLendingOutstanding;
    const availableBalance = salary + externalIncome + savings + activeLoans - expenses - lendingFromPersonal;
    const loanDebt = activeLoans + borrowedLending;
    const netBalance = availableBalance - loanDebt;
    return {
        availableBalance,
        loanDebt,
        netBalance,
        salary,
        externalIncome,
        savings,
        activeLoans,
        borrowedLending,
        repaidLoans,
        expenses,
        lendingFromPersonal,
        lendingOutstanding,
        totalLoanDebt: loanDebt,
        totalLending: lendingOutstanding,
        totalBalance: availableBalance,
        totalExpenses: expenses,
        totalDebt: loanDebt,
        netPosition: netBalance,
        breakdown: {
            salary,
            externalIncome,
            savings,
            expenses,
            directLoans: {
                ...directLoans,
                outstanding: activeLoans,
            },
            borrowedLendingLoans: {
                ...borrowedLendingLoans,
                outstanding: borrowedLending,
            },
            lending: {
                personalPrincipal: personalLending.principal,
                personalRepaid: personalLending.repaid,
                personalOutstanding: lendingFromPersonal,
                borrowedPrincipal: borrowedLendingRecords.principal,
                borrowedRepaid: borrowedLendingRecords.repaid,
                borrowedOutstanding: borrowedLendingOutstanding,
                outstanding: lendingOutstanding,
            },
            balanceAccounts: {
                total: balanceAccountTotal,
            },
            formulaNotes: {
                borrowedLendingDebtSource: "Borrowed lending debt is counted from linked LoanDebt records, not from Lending again.",
                activeLoans: "Top-level activeLoans is outstanding direct loan debt after direct loan repayments.",
                borrowedLending: "Top-level borrowedLending is outstanding linked borrowed-lending debt after repayments.",
            },
        },
    };
}
async function getCanonicalFinanceSummary(userId) {
    const [salaryAgg, incomeAgg, savingsAgg, expenseAgg, loanAgg, lendingAgg, balanceAgg,] = await Promise.all([
        SalaryMonth_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: "$totalSalary" } } },
        ]),
        Income_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Savings_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Expense_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        LoanDebt_1.default.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: {
                        $cond: [
                            {
                                $eq: [{ $ifNull: ["$linkedLendingId", ""] }, ""],
                            },
                            "DIRECT",
                            "BORROWED_LENDING",
                        ],
                    },
                    principal: { $sum: "$amount" },
                    repaid: { $sum: "$paidAmount" },
                },
            },
        ]),
        Lending_1.default.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: "$fundingSource",
                    principal: { $sum: "$amount" },
                    repaid: { $sum: "$repaidAmount" },
                },
            },
        ]),
        BalanceAccount_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
    ]);
    const salary = sumAggValue(salaryAgg);
    const externalIncome = sumAggValue(incomeAgg);
    const savings = sumAggValue(savingsAgg);
    const expenses = sumAggValue(expenseAgg);
    const balanceAccountTotal = sumAggValue(balanceAgg);
    const { direct, borrowed } = splitLoanBuckets(loanAgg);
    const lending = splitLendingBuckets(lendingAgg);
    return buildCanonicalFinanceSummary({
        salary,
        externalIncome,
        savings,
        expenses,
        directLoans: direct,
        borrowedLendingLoans: borrowed,
        personalLending: lending.personal,
        borrowedLending: lending.borrowed,
        balanceAccountTotal,
    });
}
