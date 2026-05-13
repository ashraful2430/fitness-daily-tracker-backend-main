import MonthlyIncome from "../models/MonthlyIncome";
import SalaryMonth from "../models/SalaryMonth";
import Income from "../models/Income";

export function getMonthKey(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

export async function upsertMonthlyIncome(
  userId: string,
  year: number,
  month: number,
  patch: Partial<{
    totalIncome: number;
    salaryIncome: number;
    externalIncome: number;
  }>,
) {
  return MonthlyIncome.findOneAndUpdate(
    { userId, year, month },
    {
      userId,
      year,
      month,
      ...patch,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();
}

export async function recomputeMonthlyIncome(
  userId: string,
  year: number,
  month: number,
) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);

  // Salary rule: use SalaryMonth.totalSalary as the authoritative monthly salary snapshot.
  const [salaryDoc, externalAgg] = await Promise.all([
    SalaryMonth.findOne({ userId, year, month }).lean(),
    Income.aggregate([
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

  return (
    updated ?? {
      userId,
      year,
      month,
      salaryIncome,
      externalIncome,
      totalIncome,
    }
  );
}

export async function getMonthlyIncomeOrDefault(
  userId: string,
  year: number,
  month: number,
) {
  const existing = await MonthlyIncome.findOne({ userId, year, month }).lean();
  if (existing) {
    return existing;
  }
  return recomputeMonthlyIncome(userId, year, month);
}

export async function getMonthlyIncomeHistory(userId: string, limit: number) {
  return MonthlyIncome.find({ userId })
    .sort({ year: -1, month: -1 })
    .limit(limit)
    .lean();
}
