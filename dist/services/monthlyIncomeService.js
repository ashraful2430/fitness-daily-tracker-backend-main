"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthKey = getMonthKey;
exports.upsertMonthlyIncome = upsertMonthlyIncome;
exports.recomputeMonthlyIncome = recomputeMonthlyIncome;
exports.getMonthlyIncomeOrDefault = getMonthlyIncomeOrDefault;
exports.getMonthlyIncomeHistory = getMonthlyIncomeHistory;
const MonthlyIncome_1 = __importDefault(require("../models/MonthlyIncome"));
const SalaryMonth_1 = __importDefault(require("../models/SalaryMonth"));
const Income_1 = __importDefault(require("../models/Income"));
function getMonthKey(date) {
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
    };
}
async function upsertMonthlyIncome(userId, year, month, patch) {
    return MonthlyIncome_1.default.findOneAndUpdate({ userId, year, month }, {
        userId,
        year,
        month,
        ...patch,
    }, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
    }).lean();
}
async function recomputeMonthlyIncome(userId, year, month) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0, 0);
    // Salary rule: use SalaryMonth.totalSalary as the authoritative monthly salary snapshot.
    const [salaryDoc, externalAgg] = await Promise.all([
        SalaryMonth_1.default.findOne({ userId, year, month }).lean(),
        Income_1.default.aggregate([
            {
                $match: {
                    userId,
                    date: { $gte: start, $lt: end },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
    ]);
    const salaryIncome = salaryDoc?.totalSalary ?? 0;
    const externalIncome = externalAgg[0]?.total ?? 0;
    const totalIncome = salaryIncome + externalIncome;
    const updated = await upsertMonthlyIncome(userId, year, month, {
        salaryIncome,
        externalIncome,
        totalIncome,
    });
    return (updated ?? {
        userId,
        year,
        month,
        salaryIncome,
        externalIncome,
        totalIncome,
    });
}
async function getMonthlyIncomeOrDefault(userId, year, month) {
    const existing = await MonthlyIncome_1.default.findOne({ userId, year, month }).lean();
    if (existing) {
        return existing;
    }
    return recomputeMonthlyIncome(userId, year, month);
}
async function getMonthlyIncomeHistory(userId, limit) {
    return MonthlyIncome_1.default.find({ userId })
        .sort({ year: -1, month: -1 })
        .limit(limit)
        .lean();
}
