import dotenv from "dotenv";
import mongoose from "mongoose";
import SalaryMonth from "../models/SalaryMonth";
import Income from "../models/Income";
import { connectDB } from "../config/db";
import { recomputeMonthlyIncome } from "../services/monthlyIncomeService";

dotenv.config();

async function run() {
  await connectDB();

  const keys = new Set<string>();

  const [salaryRows, incomeRows] = await Promise.all([
    SalaryMonth.find({}, { userId: 1, year: 1, month: 1 }).lean(),
    Income.aggregate([
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
    await recomputeMonthlyIncome(userId, Number(yearRaw), Number(monthRaw));
    updated += 1;
  }

  console.log(`MonthlyIncome backfill complete. Upserted ${updated} month rows.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
