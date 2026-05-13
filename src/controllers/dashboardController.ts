import { Request, Response } from "express";
import mongoose from "mongoose";
import { FocusSession, WaterIntake, WeeklyGoal, WorkoutStreak } from "../models/DashboardData";
import User from "../models/User";
import WeeklyStats from "../models/WeeklyStats";
import Workout from "../models/Workout";
import Income from "../models/Income";
import Expense from "../models/Expense";
import Loan from "../models/Loan";
import Lending from "../models/Lending";
import { ScoreSection } from "../models/ScoreSection";
import { getCanonicalFinanceSummary } from "../services/canonicalFinanceSummaryService";
import { computeDailyProgress } from "../services/dashboardProgressService";
import { getMonthlyIncomeOrDefault } from "../services/monthlyIncomeService";

type AuthedRequest = Request & { userId?: string };
const SERVER_TIMEZONE = "Asia/Dhaka";

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const now = new Date();
    const today = getStartOfDay(now);
    const tomorrow = addDays(today, 1);

    const [user, focusToday, workoutsTodayAgg, sectionsToday, financeSummary, weeklyStats] =
      await Promise.all([
        User.findById(userId)
          .select("loginStreak longestLoginStreak lastLoginDate")
          .lean(),
        ensureFocusSession(userId, today),
        Workout.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: today, $lt: tomorrow },
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalDuration: { $sum: "$duration" },
              totalCalories: { $sum: "$calories" },
            },
          },
        ]),
        ScoreSection.find({ userId: new mongoose.Types.ObjectId(userId), date: today })
          .select("goalValue currentValue")
          .lean(),
        getCanonicalFinanceSummary(userId),
        getWeeklyStatsRows(userId, now),
      ]);

    const workoutsToday = {
      count: workoutsTodayAgg[0]?.count ?? 0,
      totalDuration: workoutsTodayAgg[0]?.totalDuration ?? 0,
      totalCalories: workoutsTodayAgg[0]?.totalCalories ?? 0,
    };

    const completedSections = sectionsToday.filter(
      (row) => (row.currentValue ?? 0) >= (row.goalValue ?? 0),
    ).length;

    const loggedInToday =
      user?.lastLoginDate != null &&
      localDateKey(new Date(user.lastLoginDate)) === localDateKey(now);

    const progress = computeDailyProgress({
      loggedInToday,
      focusMinutes: focusToday.totalMinutes ?? 0,
      workoutCount: workoutsToday.count,
      completedSections,
      totalSections: sectionsToday.length,
    });

    const moduleOverview = await buildModuleOverview(userId, now, financeSummary.availableBalance ?? 0);

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          loginStreak: {
            current: user?.loginStreak ?? 0,
            longest: user?.longestLoginStreak ?? 0,
            lastLoginDate: user?.lastLoginDate ?? null,
          },
          availableBalance: financeSummary.availableBalance ?? 0,
          focusToday: {
            minutes: focusToday.totalMinutes ?? 0,
            sessionsCount: focusToday.sessions?.length ?? 0,
          },
          workoutsToday,
          todayScore: progress.todayScore,
        },
        dailyProgress: progress.dailyProgress,
        moduleOverview,
        recentActivities: [],
        weeklyStats,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
};

export const getWeeklyStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const data = await getWeeklyStatsRows(userId, new Date());
    return res.status(200).json({
      success: true,
      data,
      meta: {
        weekStartRule: "Sunday 00:00 server-local-time",
        timezone: SERVER_TIMEZONE,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
};

export const getMonthlyOverview = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const now = new Date();
    const current = getLocalMonthYear(now);
    const month = req.query.month === undefined ? current.month : Number(req.query.month);
    const year = req.query.year === undefined ? current.year : Number(req.query.year);

    const validationError = validateMonthYear(month, year);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    const selectedRange = getMonthRange(month, year);
    const previousMonth = shiftMonth(month, year, -1);
    const previousRange = getMonthRange(previousMonth.month, previousMonth.year);

    const [selectedMoney, previousMoney, selectedProd, previousProd, dailySeries, summary] =
      await Promise.all([
        getMonthlyMoney(userId, selectedRange.start, selectedRange.end),
        getMonthlyMoney(userId, previousRange.start, previousRange.end),
        getMonthlyProductivity(userId, selectedRange.start, selectedRange.end),
        getMonthlyProductivity(userId, previousRange.start, previousRange.end),
        getMonthlyDailySeries(userId, selectedRange.start, selectedRange.end),
        getCanonicalFinanceSummary(userId),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        selectedMonth: { month, year, label: formatMonthLabel(month, year) },
        money: {
          income: selectedMoney.income,
          expense: selectedMoney.expense,
          savings: selectedMoney.income - selectedMoney.expense,
          netBalanceChange: selectedMoney.income - selectedMoney.expense,
          availableBalanceEndOfMonth: summary.availableBalance ?? 0,
        },
        productivity: selectedProd,
        comparison: {
          previousMonth: {
            month: previousMonth.month,
            year: previousMonth.year,
            label: formatMonthLabel(previousMonth.month, previousMonth.year),
          },
          incomePct: safePercentChange(selectedMoney.income, previousMoney.income),
          expensePct: safePercentChange(selectedMoney.expense, previousMoney.expense),
          savingsPct: safePercentChange(
            selectedMoney.income - selectedMoney.expense,
            previousMoney.income - previousMoney.expense,
          ),
          focusPct: safePercentChange(
            selectedProd.totalFocusMinutes,
            previousProd.totalFocusMinutes,
          ),
          workoutsPct: safePercentChange(
            selectedProd.totalWorkouts,
            previousProd.totalWorkouts,
          ),
          scorePct: safePercentChange(
            selectedProd.averageDailyScore,
            previousProd.averageDailyScore,
          ),
        },
        dailySeries,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
};

export const getMonthlyHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const limit = req.query.limit === undefined ? 6 : Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 24) {
      return res.status(400).json({
        success: false,
        message: "limit must be an integer between 1 and 24",
        field: "limit",
      });
    }

    const now = getLocalMonthYear(new Date());
    const data: Array<Record<string, number | string>> = [];

    for (let i = 0; i < limit; i += 1) {
      const item = shiftMonth(now.month, now.year, -i);
      const range = getMonthRange(item.month, item.year);
      const [money, productivity] = await Promise.all([
        getMonthlyMoney(userId, range.start, range.end),
        getMonthlyProductivity(userId, range.start, range.end),
      ]);

      data.push({
        month: item.month,
        year: item.year,
        label: formatMonthLabel(item.month, item.year),
        income: money.income,
        expense: money.expense,
        savings: money.income - money.expense,
        netBalanceChange: money.income - money.expense,
        averageDailyScore: productivity.averageDailyScore,
        totalFocusMinutes: productivity.totalFocusMinutes,
        totalWorkouts: productivity.totalWorkouts,
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
};

export const updateWeeklyStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { dailyStats } = req.body as {
      dailyStats?: Array<{ workouts: number; focusMinutes: number }>;
    };

    if (!Array.isArray(dailyStats) || dailyStats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "dailyStats must be a non-empty array",
        field: "dailyStats",
      });
    }

    const hasInvalidItem = dailyStats.some(
      (stat) =>
        typeof stat?.workouts !== "number" ||
        stat.workouts < 0 ||
        typeof stat?.focusMinutes !== "number" ||
        stat.focusMinutes < 0,
    );
    if (hasInvalidItem) {
      return res.status(400).json({
        success: false,
        message: "Each dailyStats item must contain non-negative workouts and focusMinutes",
        field: "dailyStats",
      });
    }

    const weekStart = getStartOfWeek(new Date());
    const normalizedDailyStats = buildDailyStatsFromInput(weekStart, dailyStats);
    const totals = normalizedDailyStats.reduce(
      (acc, day) => {
        acc.workouts += day.workouts;
        acc.focusMinutes += day.focusMinutes;
        return acc;
      },
      { workouts: 0, focusMinutes: 0 },
    );

    const weeklyStatsDoc = await WeeklyStats.findOneAndUpdate(
      { userId, weekStart },
      {
        userId,
        weekStart,
        dailyStats: normalizedDailyStats,
        workouts: totals.workouts,
        focusMinutes: totals.focusMinutes,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return res.status(200).json({ success: true, data: weeklyStatsDoc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
};

export const updateWaterIntake = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { glassesConsumed } = req.body as { glassesConsumed?: number };
    if (typeof glassesConsumed !== "number" || glassesConsumed < 0) {
      return res.status(400).json({
        success: false,
        message: "glassesConsumed must be a non-negative number",
        field: "glassesConsumed",
      });
    }

    const today = getStartOfDay(new Date());
    const existing = await WaterIntake.findOne({ userId, date: today }).lean();
    const goalGlasses = existing?.goalGlasses ?? 8;
    const waterDoc = await WaterIntake.findOneAndUpdate(
      { userId, date: today },
      { userId, date: today, glassesConsumed, goalGlasses },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    if (!waterDoc) {
      return res.status(500).json({ success: false, message: "Server error" });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...waterDoc,
        percentage: calculatePercentage(waterDoc.glassesConsumed, waterDoc.goalGlasses),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
};

export const logFocusSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { startTime, endTime, category } = req.body as {
      startTime?: string;
      endTime?: string;
      category?: string;
    };

    if (!startTime) {
      return res.status(400).json({ success: false, message: "startTime is required", field: "startTime" });
    }
    if (!endTime) {
      return res.status(400).json({ success: false, message: "endTime is required", field: "endTime" });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: "category is required", field: "category" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: "startTime must be a valid ISO date string",
        field: "startTime",
      });
    }
    if (Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "endTime must be a valid ISO date string",
        field: "endTime",
      });
    }
    if (end <= start) {
      return res.status(400).json({ success: false, message: "endTime must be after startTime", field: "endTime" });
    }

    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    const today = getStartOfDay(new Date());
    const focusDoc = await FocusSession.findOneAndUpdate(
      { userId, date: today },
      {
        $setOnInsert: { userId, date: today, totalMinutes: 0, sessions: [] },
        $push: { sessions: { startTime: start, endTime: end, duration, category: category.trim() } },
        $inc: { totalMinutes: duration },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return res.status(200).json({ success: true, data: focusDoc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
};

export const updateWeeklyGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { completedWorkouts, goalWorkouts } = req.body as { completedWorkouts?: number; goalWorkouts?: number };
    if (
      typeof completedWorkouts !== "number" ||
      completedWorkouts < 0 ||
      typeof goalWorkouts !== "number" ||
      goalWorkouts <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "completedWorkouts must be non-negative and goalWorkouts must be greater than 0",
        field: "completedWorkouts",
      });
    }

    const weekStart = getStartOfWeek(new Date());
    const progressPercentage = calculatePercentage(completedWorkouts, goalWorkouts);
    const weeklyGoalDoc = await WeeklyGoal.findOneAndUpdate(
      { userId, weekStart },
      { userId, weekStart, completedWorkouts, goalWorkouts, progressPercentage },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return res.status(200).json({ success: true, data: weeklyGoalDoc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
};

function getStartOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}
function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}
// Week boundary uses server-local week: Sunday 00:00.
function getStartOfWeek(date: Date) {
  const weekStart = getStartOfDay(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}
function calculatePercentage(part: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min(Math.round((part / total) * 100), 100);
}
function localDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SERVER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function getLocalMonthYear(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SERVER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  return {
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
    year: Number(parts.find((part) => part.type === "year")?.value ?? "1970"),
  };
}
function formatMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SERVER_TIMEZONE,
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}
function shiftMonth(month: number, year: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}
function getMonthRange(month: number, year: number) {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 1, 0, 0, 0, 0),
  };
}
function safePercentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
function validateMonthYear(month: number, year: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { success: false, message: "month must be an integer between 1 and 12", field: "month" };
  }
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    return { success: false, message: "year must be a valid YYYY value", field: "year" };
  }
  return null;
}
function getTrend(current: number, previous: number): "up" | "down" | "stable" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "stable";
}

async function getWeeklyStatsRows(userId: string, now: Date) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(getStartOfWeek(now), index);
    return {
      dateKey: date.toISOString().split("T")[0],
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()],
      start: date,
      end: addDays(date, 1),
    };
  });
  const weekStart = days[0].start;
  const weekEnd = days[6].end;
  const objectUserId = new mongoose.Types.ObjectId(userId);

  const [workoutAgg, focusAgg, incomeAgg, expenseAgg] = await Promise.all([
    Workout.aggregate([
      { $match: { userId: objectUserId, createdAt: { $gte: weekStart, $lt: weekEnd } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    FocusSession.aggregate([
      { $match: { userId: objectUserId, date: { $gte: weekStart, $lt: weekEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalMinutes: { $sum: "$totalMinutes" },
        },
      },
    ]),
    Income.aggregate([
      { $match: { userId, date: { $gte: weekStart, $lt: weekEnd } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { userId, date: { $gte: weekStart, $lt: weekEnd } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, count: { $sum: 1 } } },
    ]),
  ]);

  const workoutMap = Object.fromEntries(workoutAgg.map((row) => [row._id, row.count]));
  const focusMap = Object.fromEntries(focusAgg.map((row) => [row._id, row.totalMinutes]));
  const moneyMap: Record<string, number> = {};
  for (const row of incomeAgg) moneyMap[row._id] = (moneyMap[row._id] ?? 0) + (row.count ?? 0);
  for (const row of expenseAgg) moneyMap[row._id] = (moneyMap[row._id] ?? 0) + (row.count ?? 0);

  return days.map((day) => ({
    date: day.dateKey,
    day: day.day,
    workouts: workoutMap[day.dateKey] ?? 0,
    focusMinutes: focusMap[day.dateKey] ?? 0,
    moneyActivities: moneyMap[day.dateKey] ?? 0,
  }));
}

async function getMonthlyMoney(userId: string, start: Date, end: Date) {
  const year = start.getFullYear();
  const month = start.getMonth() + 1;
  const [monthlyIncome, expenseAgg] = await Promise.all([
    getMonthlyIncomeOrDefault(userId, year, month),
    Expense.aggregate([{ $match: { userId, date: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
  ]);
  return { income: monthlyIncome.totalIncome ?? 0, expense: expenseAgg[0]?.total ?? 0 };
}

async function getMonthlyProductivity(userId: string, start: Date, end: Date) {
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const [workoutAgg, focusAgg] = await Promise.all([
    Workout.aggregate([{ $match: { userId: objectUserId, createdAt: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: 1 } } }]),
    FocusSession.aggregate([{ $match: { userId: objectUserId, date: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: "$totalMinutes" } } }]),
  ]);
  const totalWorkouts = workoutAgg[0]?.total ?? 0;
  const totalFocusMinutes = focusAgg[0]?.total ?? 0;
  const days = Math.max(Math.round((end.getTime() - start.getTime()) / 86400000), 1);
  const averageDailyScore = Math.round(Math.min(totalFocusMinutes / (days * 120), 1) * 50 + Math.min(totalWorkouts / days, 1) * 50);
  return { averageDailyScore, totalFocusMinutes, totalWorkouts };
}

async function getMonthlyDailySeries(userId: string, start: Date, end: Date) {
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const [incomeAgg, expenseAgg, workoutAgg, focusAgg] = await Promise.all([
    Income.aggregate([{ $match: { userId, date: { $gte: start, $lt: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$amount" } } }]),
    Expense.aggregate([{ $match: { userId, date: { $gte: start, $lt: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$amount" } } }]),
    Workout.aggregate([{ $match: { userId: objectUserId, createdAt: { $gte: start, $lt: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: 1 } } }]),
    FocusSession.aggregate([{ $match: { userId: objectUserId, date: { $gte: start, $lt: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$totalMinutes" } } }]),
  ]);
  const incomeMap = Object.fromEntries(incomeAgg.map((row) => [row._id, row.total]));
  const expenseMap = Object.fromEntries(expenseAgg.map((row) => [row._id, row.total]));
  const workoutsMap = Object.fromEntries(workoutAgg.map((row) => [row._id, row.total]));
  const focusMap = Object.fromEntries(focusAgg.map((row) => [row._id, row.total]));

  const rows = [];
  for (let cursor = new Date(start); cursor < end; cursor = addDays(cursor, 1)) {
    const date = cursor.toISOString().split("T")[0];
    const income = incomeMap[date] ?? 0;
    const expense = expenseMap[date] ?? 0;
    const focusMinutes = focusMap[date] ?? 0;
    const workouts = workoutsMap[date] ?? 0;
    const score = Math.round(Math.min(focusMinutes / 120, 1) * 50 + Math.min(workouts, 1) * 50);
    rows.push({ date, income, expense, focusMinutes, workouts, score });
  }
  return rows;
}

async function buildModuleOverview(userId: string, now: Date, availableBalance: number) {
  const today = getStartOfDay(now);
  const thisWeek = { start: getStartOfWeek(now), end: addDays(getStartOfWeek(now), 7) };
  const prevWeek = { start: addDays(thisWeek.start, -7), end: thisWeek.start };
  const thisMonth = getLocalMonthYear(now);
  const prevMonth = shiftMonth(thisMonth.month, thisMonth.year, -1);

  const [thisWeekWorkouts, prevWeekWorkouts, todayWorkouts, thisWeekFocus, prevWeekFocus, thisMoney, prevMoney, thisLoans, prevLoans, thisLendings, prevLendings, sectionsToday, sectionsYesterday] = await Promise.all([
    Workout.countDocuments({ userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: thisWeek.start, $lt: thisWeek.end } }),
    Workout.countDocuments({ userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: prevWeek.start, $lt: prevWeek.end } }),
    Workout.countDocuments({ userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: today, $lt: addDays(today, 1) } }),
    sumFocus(userId, thisWeek.start, thisWeek.end),
    sumFocus(userId, prevWeek.start, prevWeek.end),
    getMonthlyMoney(userId, getMonthRange(thisMonth.month, thisMonth.year).start, getMonthRange(thisMonth.month, thisMonth.year).end),
    getMonthlyMoney(userId, getMonthRange(prevMonth.month, prevMonth.year).start, getMonthRange(prevMonth.month, prevMonth.year).end),
    Loan.countDocuments({ userId, status: { $in: ["ACTIVE", "PARTIAL"] } }),
    Loan.countDocuments({ userId, status: { $in: ["ACTIVE", "PARTIAL"] }, createdAt: { $lt: prevWeek.end } }),
    Lending.countDocuments({ userId, status: { $in: ["ACTIVE", "PARTIALLY_REPAID"] } }),
    Lending.countDocuments({ userId, status: { $in: ["ACTIVE", "PARTIALLY_REPAID"] }, createdAt: { $lt: prevWeek.end } }),
    getSectionCompletion(userId, today),
    getSectionCompletion(userId, addDays(today, -1)),
  ]);

  return {
    fitness: { weeklyWorkouts: thisWeekWorkouts, todayWorkouts, trend: getTrend(thisWeekWorkouts, prevWeekWorkouts) },
    learning: { weeklyFocusMinutes: thisWeekFocus, todayFocusMinutes: await sumFocus(userId, today, addDays(today, 1)), trend: getTrend(thisWeekFocus, prevWeekFocus) },
    money: { availableBalance, monthIncome: thisMoney.income, monthExpense: thisMoney.expense, trend: getTrend(thisMoney.income - thisMoney.expense, prevMoney.income - prevMoney.expense) },
    loans: { activeLoans: thisLoans, activeLendings: thisLendings, trend: getTrend(thisLoans + thisLendings, prevLoans + prevLendings) },
    sections: { completedToday: sectionsToday.completed, totalToday: sectionsToday.total, trend: getTrend(sectionsToday.completed, sectionsYesterday.completed) },
  };
}

async function sumFocus(userId: string, start: Date, end: Date) {
  const rows = await FocusSession.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: "$totalMinutes" } } },
  ]);
  return rows[0]?.total ?? 0;
}
async function getSectionCompletion(userId: string, date: Date) {
  const rows = await ScoreSection.find({ userId: new mongoose.Types.ObjectId(userId), date }).lean();
  return {
    completed: rows.filter((row) => (row.currentValue ?? 0) >= (row.goalValue ?? 0)).length,
    total: rows.length,
  };
}
function buildDailyStatsFromInput(weekStart: Date, dailyStats: Array<{ workouts: number; focusMinutes: number }>) {
  return dailyStats.slice(0, 7).map((stat, index) => ({
    date: addDays(weekStart, index),
    workouts: stat.workouts,
    focusMinutes: stat.focusMinutes,
  }));
}
async function ensureFocusSession(userId: string, date: Date) {
  const existing = await FocusSession.findOne({ userId, date }).lean();
  if (existing) return existing;
  return FocusSession.create({ userId, date, totalMinutes: 0, sessions: [] });
}
async function ensureWorkoutStreak(userId: string) {
  const existing = await WorkoutStreak.findOne({ userId }).lean();
  if (existing) return existing;
  return WorkoutStreak.create({ userId, currentStreak: 0, longestStreak: 0 });
}
