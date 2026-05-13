"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWeeklyGoal = exports.logFocusSession = exports.updateWaterIntake = exports.updateWeeklyStats = exports.getMonthlyHistory = exports.getMonthlyOverview = exports.getWeeklyStats = exports.getDashboardData = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const DashboardData_1 = require("../models/DashboardData");
const User_1 = __importDefault(require("../models/User"));
const WeeklyStats_1 = __importDefault(require("../models/WeeklyStats"));
const Workout_1 = __importDefault(require("../models/Workout"));
const Income_1 = __importDefault(require("../models/Income"));
const Expense_1 = __importDefault(require("../models/Expense"));
const Loan_1 = __importDefault(require("../models/Loan"));
const Lending_1 = __importDefault(require("../models/Lending"));
const ScoreSection_1 = require("../models/ScoreSection");
const canonicalFinanceSummaryService_1 = require("../services/canonicalFinanceSummaryService");
const dashboardProgressService_1 = require("../services/dashboardProgressService");
const SERVER_TIMEZONE = "Asia/Dhaka";
const getDashboardData = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const now = new Date();
        const today = getStartOfDay(now);
        const tomorrow = addDays(today, 1);
        const [user, focusToday, workoutsTodayAgg, sectionsToday, financeSummary, weeklyStats] = await Promise.all([
            User_1.default.findById(userId)
                .select("loginStreak longestLoginStreak lastLoginDate")
                .lean(),
            ensureFocusSession(userId, today),
            Workout_1.default.aggregate([
                {
                    $match: {
                        userId: new mongoose_1.default.Types.ObjectId(userId),
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
            ScoreSection_1.ScoreSection.find({ userId: new mongoose_1.default.Types.ObjectId(userId), date: today })
                .select("goalValue currentValue")
                .lean(),
            (0, canonicalFinanceSummaryService_1.getCanonicalFinanceSummary)(userId),
            getWeeklyStatsRows(userId, now),
        ]);
        const workoutsToday = {
            count: workoutsTodayAgg[0]?.count ?? 0,
            totalDuration: workoutsTodayAgg[0]?.totalDuration ?? 0,
            totalCalories: workoutsTodayAgg[0]?.totalCalories ?? 0,
        };
        const completedSections = sectionsToday.filter((row) => (row.currentValue ?? 0) >= (row.goalValue ?? 0)).length;
        const loggedInToday = user?.lastLoginDate != null &&
            localDateKey(new Date(user.lastLoginDate)) === localDateKey(now);
        const progress = (0, dashboardProgressService_1.computeDailyProgress)({
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
};
exports.getDashboardData = getDashboardData;
const getWeeklyStats = async (req, res) => {
    try {
        const userId = req.userId;
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
};
exports.getWeeklyStats = getWeeklyStats;
const getMonthlyOverview = async (req, res) => {
    try {
        const userId = req.userId;
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
        const [selectedMoney, previousMoney, selectedProd, previousProd, dailySeries, summary] = await Promise.all([
            getMonthlyMoney(userId, selectedRange.start, selectedRange.end),
            getMonthlyMoney(userId, previousRange.start, previousRange.end),
            getMonthlyProductivity(userId, selectedRange.start, selectedRange.end),
            getMonthlyProductivity(userId, previousRange.start, previousRange.end),
            getMonthlyDailySeries(userId, selectedRange.start, selectedRange.end),
            (0, canonicalFinanceSummaryService_1.getCanonicalFinanceSummary)(userId),
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
                    savingsPct: safePercentChange(selectedMoney.income - selectedMoney.expense, previousMoney.income - previousMoney.expense),
                    focusPct: safePercentChange(selectedProd.totalFocusMinutes, previousProd.totalFocusMinutes),
                    workoutsPct: safePercentChange(selectedProd.totalWorkouts, previousProd.totalWorkouts),
                    scorePct: safePercentChange(selectedProd.averageDailyScore, previousProd.averageDailyScore),
                },
                dailySeries,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
};
exports.getMonthlyOverview = getMonthlyOverview;
const getMonthlyHistory = async (req, res) => {
    try {
        const userId = req.userId;
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
        const data = [];
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
};
exports.getMonthlyHistory = getMonthlyHistory;
const updateWeeklyStats = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { dailyStats } = req.body;
        if (!Array.isArray(dailyStats) || dailyStats.length === 0) {
            return res.status(400).json({
                success: false,
                message: "dailyStats must be a non-empty array",
                field: "dailyStats",
            });
        }
        const hasInvalidItem = dailyStats.some((stat) => typeof stat?.workouts !== "number" ||
            stat.workouts < 0 ||
            typeof stat?.focusMinutes !== "number" ||
            stat.focusMinutes < 0);
        if (hasInvalidItem) {
            return res.status(400).json({
                success: false,
                message: "Each dailyStats item must contain non-negative workouts and focusMinutes",
                field: "dailyStats",
            });
        }
        const weekStart = getStartOfWeek(new Date());
        const normalizedDailyStats = buildDailyStatsFromInput(weekStart, dailyStats);
        const totals = normalizedDailyStats.reduce((acc, day) => {
            acc.workouts += day.workouts;
            acc.focusMinutes += day.focusMinutes;
            return acc;
        }, { workouts: 0, focusMinutes: 0 });
        const weeklyStatsDoc = await WeeklyStats_1.default.findOneAndUpdate({ userId, weekStart }, {
            userId,
            weekStart,
            dailyStats: normalizedDailyStats,
            workouts: totals.workouts,
            focusMinutes: totals.focusMinutes,
        }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
        return res.status(200).json({ success: true, data: weeklyStatsDoc });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
};
exports.updateWeeklyStats = updateWeeklyStats;
const updateWaterIntake = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { glassesConsumed } = req.body;
        if (typeof glassesConsumed !== "number" || glassesConsumed < 0) {
            return res.status(400).json({
                success: false,
                message: "glassesConsumed must be a non-negative number",
                field: "glassesConsumed",
            });
        }
        const today = getStartOfDay(new Date());
        const existing = await DashboardData_1.WaterIntake.findOne({ userId, date: today }).lean();
        const goalGlasses = existing?.goalGlasses ?? 8;
        const waterDoc = await DashboardData_1.WaterIntake.findOneAndUpdate({ userId, date: today }, { userId, date: today, glassesConsumed, goalGlasses }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
};
exports.updateWaterIntake = updateWaterIntake;
const logFocusSession = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { startTime, endTime, category } = req.body;
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
        const focusDoc = await DashboardData_1.FocusSession.findOneAndUpdate({ userId, date: today }, {
            $setOnInsert: { userId, date: today, totalMinutes: 0, sessions: [] },
            $push: { sessions: { startTime: start, endTime: end, duration, category: category.trim() } },
            $inc: { totalMinutes: duration },
        }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
        return res.status(200).json({ success: true, data: focusDoc });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
};
exports.logFocusSession = logFocusSession;
const updateWeeklyGoal = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { completedWorkouts, goalWorkouts } = req.body;
        if (typeof completedWorkouts !== "number" ||
            completedWorkouts < 0 ||
            typeof goalWorkouts !== "number" ||
            goalWorkouts <= 0) {
            return res.status(400).json({
                success: false,
                message: "completedWorkouts must be non-negative and goalWorkouts must be greater than 0",
                field: "completedWorkouts",
            });
        }
        const weekStart = getStartOfWeek(new Date());
        const progressPercentage = calculatePercentage(completedWorkouts, goalWorkouts);
        const weeklyGoalDoc = await DashboardData_1.WeeklyGoal.findOneAndUpdate({ userId, weekStart }, { userId, weekStart, completedWorkouts, goalWorkouts, progressPercentage }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
        return res.status(200).json({ success: true, data: weeklyGoalDoc });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
};
exports.updateWeeklyGoal = updateWeeklyGoal;
function getStartOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}
function addDays(date, days) {
    const value = new Date(date);
    value.setDate(value.getDate() + days);
    return value;
}
// Week boundary uses server-local week: Sunday 00:00.
function getStartOfWeek(date) {
    const weekStart = getStartOfDay(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return weekStart;
}
function calculatePercentage(part, total) {
    if (!total || total <= 0)
        return 0;
    return Math.min(Math.round((part / total) * 100), 100);
}
function localDateKey(date) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: SERVER_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}
function getLocalMonthYear(date) {
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
function formatMonthLabel(month, year) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: SERVER_TIMEZONE,
        month: "short",
        year: "numeric",
    }).format(new Date(year, month - 1, 1));
}
function shiftMonth(month, year, delta) {
    const d = new Date(year, month - 1 + delta, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
}
function getMonthRange(month, year) {
    return {
        start: new Date(year, month - 1, 1, 0, 0, 0, 0),
        end: new Date(year, month, 1, 0, 0, 0, 0),
    };
}
function safePercentChange(current, previous) {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }
    return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
function validateMonthYear(month, year) {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        return { success: false, message: "month must be an integer between 1 and 12", field: "month" };
    }
    if (!Number.isInteger(year) || year < 1900 || year > 9999) {
        return { success: false, message: "year must be a valid YYYY value", field: "year" };
    }
    return null;
}
function getTrend(current, previous) {
    if (current > previous)
        return "up";
    if (current < previous)
        return "down";
    return "stable";
}
async function getWeeklyStatsRows(userId, now) {
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
    const objectUserId = new mongoose_1.default.Types.ObjectId(userId);
    const [workoutAgg, focusAgg, incomeAgg, expenseAgg] = await Promise.all([
        Workout_1.default.aggregate([
            { $match: { userId: objectUserId, createdAt: { $gte: weekStart, $lt: weekEnd } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        ]),
        DashboardData_1.FocusSession.aggregate([
            { $match: { userId: objectUserId, date: { $gte: weekStart, $lt: weekEnd } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    totalMinutes: { $sum: "$totalMinutes" },
                },
            },
        ]),
        Income_1.default.aggregate([
            { $match: { userId, date: { $gte: weekStart, $lt: weekEnd } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, count: { $sum: 1 } } },
        ]),
        Expense_1.default.aggregate([
            { $match: { userId, date: { $gte: weekStart, $lt: weekEnd } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, count: { $sum: 1 } } },
        ]),
    ]);
    const workoutMap = Object.fromEntries(workoutAgg.map((row) => [row._id, row.count]));
    const focusMap = Object.fromEntries(focusAgg.map((row) => [row._id, row.totalMinutes]));
    const moneyMap = {};
    for (const row of incomeAgg)
        moneyMap[row._id] = (moneyMap[row._id] ?? 0) + (row.count ?? 0);
    for (const row of expenseAgg)
        moneyMap[row._id] = (moneyMap[row._id] ?? 0) + (row.count ?? 0);
    return days.map((day) => ({
        date: day.dateKey,
        day: day.day,
        workouts: workoutMap[day.dateKey] ?? 0,
        focusMinutes: focusMap[day.dateKey] ?? 0,
        moneyActivities: moneyMap[day.dateKey] ?? 0,
    }));
}
async function getMonthlyMoney(userId, start, end) {
    const [incomeAgg, expenseAgg] = await Promise.all([
        Income_1.default.aggregate([{ $match: { userId, date: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
        Expense_1.default.aggregate([{ $match: { userId, date: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    return { income: incomeAgg[0]?.total ?? 0, expense: expenseAgg[0]?.total ?? 0 };
}
async function getMonthlyProductivity(userId, start, end) {
    const objectUserId = new mongoose_1.default.Types.ObjectId(userId);
    const [workoutAgg, focusAgg] = await Promise.all([
        Workout_1.default.aggregate([{ $match: { userId: objectUserId, createdAt: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: 1 } } }]),
        DashboardData_1.FocusSession.aggregate([{ $match: { userId: objectUserId, date: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: "$totalMinutes" } } }]),
    ]);
    const totalWorkouts = workoutAgg[0]?.total ?? 0;
    const totalFocusMinutes = focusAgg[0]?.total ?? 0;
    const days = Math.max(Math.round((end.getTime() - start.getTime()) / 86400000), 1);
    const averageDailyScore = Math.round(Math.min(totalFocusMinutes / (days * 120), 1) * 50 + Math.min(totalWorkouts / days, 1) * 50);
    return { averageDailyScore, totalFocusMinutes, totalWorkouts };
}
async function getMonthlyDailySeries(userId, start, end) {
    const objectUserId = new mongoose_1.default.Types.ObjectId(userId);
    const [incomeAgg, expenseAgg, workoutAgg, focusAgg] = await Promise.all([
        Income_1.default.aggregate([{ $match: { userId, date: { $gte: start, $lt: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$amount" } } }]),
        Expense_1.default.aggregate([{ $match: { userId, date: { $gte: start, $lt: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$amount" } } }]),
        Workout_1.default.aggregate([{ $match: { userId: objectUserId, createdAt: { $gte: start, $lt: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: 1 } } }]),
        DashboardData_1.FocusSession.aggregate([{ $match: { userId: objectUserId, date: { $gte: start, $lt: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$totalMinutes" } } }]),
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
async function buildModuleOverview(userId, now, availableBalance) {
    const today = getStartOfDay(now);
    const thisWeek = { start: getStartOfWeek(now), end: addDays(getStartOfWeek(now), 7) };
    const prevWeek = { start: addDays(thisWeek.start, -7), end: thisWeek.start };
    const thisMonth = getLocalMonthYear(now);
    const prevMonth = shiftMonth(thisMonth.month, thisMonth.year, -1);
    const [thisWeekWorkouts, prevWeekWorkouts, todayWorkouts, thisWeekFocus, prevWeekFocus, thisMoney, prevMoney, thisLoans, prevLoans, thisLendings, prevLendings, sectionsToday, sectionsYesterday] = await Promise.all([
        Workout_1.default.countDocuments({ userId: new mongoose_1.default.Types.ObjectId(userId), createdAt: { $gte: thisWeek.start, $lt: thisWeek.end } }),
        Workout_1.default.countDocuments({ userId: new mongoose_1.default.Types.ObjectId(userId), createdAt: { $gte: prevWeek.start, $lt: prevWeek.end } }),
        Workout_1.default.countDocuments({ userId: new mongoose_1.default.Types.ObjectId(userId), createdAt: { $gte: today, $lt: addDays(today, 1) } }),
        sumFocus(userId, thisWeek.start, thisWeek.end),
        sumFocus(userId, prevWeek.start, prevWeek.end),
        getMonthlyMoney(userId, getMonthRange(thisMonth.month, thisMonth.year).start, getMonthRange(thisMonth.month, thisMonth.year).end),
        getMonthlyMoney(userId, getMonthRange(prevMonth.month, prevMonth.year).start, getMonthRange(prevMonth.month, prevMonth.year).end),
        Loan_1.default.countDocuments({ userId, status: { $in: ["ACTIVE", "PARTIAL"] } }),
        Loan_1.default.countDocuments({ userId, status: { $in: ["ACTIVE", "PARTIAL"] }, createdAt: { $lt: prevWeek.end } }),
        Lending_1.default.countDocuments({ userId, status: { $in: ["ACTIVE", "PARTIALLY_REPAID"] } }),
        Lending_1.default.countDocuments({ userId, status: { $in: ["ACTIVE", "PARTIALLY_REPAID"] }, createdAt: { $lt: prevWeek.end } }),
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
async function sumFocus(userId, start, end) {
    const rows = await DashboardData_1.FocusSession.aggregate([
        { $match: { userId: new mongoose_1.default.Types.ObjectId(userId), date: { $gte: start, $lt: end } } },
        { $group: { _id: null, total: { $sum: "$totalMinutes" } } },
    ]);
    return rows[0]?.total ?? 0;
}
async function getSectionCompletion(userId, date) {
    const rows = await ScoreSection_1.ScoreSection.find({ userId: new mongoose_1.default.Types.ObjectId(userId), date }).lean();
    return {
        completed: rows.filter((row) => (row.currentValue ?? 0) >= (row.goalValue ?? 0)).length,
        total: rows.length,
    };
}
function buildDailyStatsFromInput(weekStart, dailyStats) {
    return dailyStats.slice(0, 7).map((stat, index) => ({
        date: addDays(weekStart, index),
        workouts: stat.workouts,
        focusMinutes: stat.focusMinutes,
    }));
}
async function ensureFocusSession(userId, date) {
    const existing = await DashboardData_1.FocusSession.findOne({ userId, date }).lean();
    if (existing)
        return existing;
    return DashboardData_1.FocusSession.create({ userId, date, totalMinutes: 0, sessions: [] });
}
async function ensureWorkoutStreak(userId) {
    const existing = await DashboardData_1.WorkoutStreak.findOne({ userId }).lean();
    if (existing)
        return existing;
    return DashboardData_1.WorkoutStreak.create({ userId, currentStreak: 0, longestStreak: 0 });
}
