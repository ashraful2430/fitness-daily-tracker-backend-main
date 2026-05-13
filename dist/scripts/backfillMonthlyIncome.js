"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const SalaryMonth_1 = __importDefault(require("../models/SalaryMonth"));
const Income_1 = __importDefault(require("../models/Income"));
const db_1 = require("../config/db");
const monthlyIncomeService_1 = require("../services/monthlyIncomeService");
dotenv_1.default.config();
async function run() {
    await (0, db_1.connectDB)();
    const keys = new Set();
    const [salaryRows, incomeRows] = await Promise.all([
        SalaryMonth_1.default.find({}, { userId: 1, year: 1, month: 1 }).lean(),
        Income_1.default.aggregate([
            {
                $project: {
                    userId: 1,
                    year: { $year: "$date" },
                    month: { $month: "$date" },
                },
            },
            {
                $group: {
                    _id: {
                        userId: "$userId",
                        year: "$year",
                        month: "$month",
                    },
                },
            },
        ]),
    ]);
    for (const row of salaryRows) {
        keys.add(`${row.userId}:${row.year}:${row.month}`);
    }
    for (const row of incomeRows) {
        keys.add(`${row._id.userId}:${row._id.year}:${row._id.month}`);
    }
    let updated = 0;
    for (const key of keys) {
        const [userId, yearRaw, monthRaw] = key.split(":");
        await (0, monthlyIncomeService_1.recomputeMonthlyIncome)(userId, Number(yearRaw), Number(monthRaw));
        updated += 1;
    }
    console.log(`MonthlyIncome backfill complete. Upserted ${updated} month rows.`);
    await mongoose_1.default.disconnect();
}
run().catch(async (error) => {
    console.error("Backfill failed:", error);
    await mongoose_1.default.disconnect();
    process.exit(1);
});
