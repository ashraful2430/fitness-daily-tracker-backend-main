"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWeeklyGoal = exports.logFocusSession = exports.updateWaterIntake = exports.updateWeeklyStats = exports.getWeeklyStats = exports.getDashboardData = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const DashboardData_1 = require("../models/DashboardData");
const Workout_1 = __importDefault(require("../models/Workout"));
const WeeklyStats_1 = __importDefault(require("../models/WeeklyStats"));
const analyticsService_1 = require("../services/analyticsService");
const getDashboardData = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const now = new Date();
        const today = getStartOfDay(now);
        const weekStart = getStartOfWeek(now);
        const [streak, water, focus, weekGoal] = await Promise.all([
            ensureWorkoutStreak(userId),
            ensureWaterIntake(userId, today),
            ensureFocusSession(userId, today),
            ensureWeeklyGoal(userId, weekStart),
        ]);
        await ensureWeeklyStatsDoc(userId, weekStart);
        const [recentWorkouts, weeklyStats, analytics] = await Promise.all([
            Workout_1.default.find({ userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select("exercise duration calories createdAt")
                .lean(),
            getWeeklyStatsOptimized(userId, now),
            (0, analyticsService_1.getAnalyticsInsights)(userId),
        ]);
        const waterPercentage = calculatePercentage(water.glassesConsumed, water.goalGlasses);
        const todayScore = calculateTodayScore(water, focus, streak, weekGoal);
        return res.status(200).json({
            success: true,
            data: {
                workoutStreak: {
                    current: streak.currentStreak,
                    longest: streak.longestStreak,
                },
                waterIntake: {
                    consumed: water.glassesConsumed,
                    goal: water.goalGlasses,
                    percentage: waterPercentage,
                },
                focusTime: {
                    minutes: focus.totalMinutes,
                    hours: Math.floor(focus.totalMinutes / 60),
                    sessionsCount: focus.sessions?.length ?? 0,
                },
                weeklyGoal: {
                    completed: weekGoal.completedWorkouts,
                    goal: weekGoal.goalWorkouts,
                    percentage: weekGoal.progressPercentage,
                },
                todayScore,
                recentWorkouts,
                weeklyStats,
                analytics,
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
        const now = new Date();
        const weekStart = getStartOfWeek(now);
        await ensureWeeklyStatsDoc(userId, weekStart);
        const weeklyStats = await getWeeklyStatsOptimized(userId, now);
        return res.status(200).json({ success: true, data: weeklyStats });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
};
exports.getWeeklyStats = getWeeklyStats;
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
        const now = new Date();
        const weekStart = getStartOfWeek(now);
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
        }, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }).lean();
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
            return res.status(400).json({
                success: false,
                message: "startTime is required",
                field: "startTime",
            });
        }
        if (!endTime) {
            return res.status(400).json({
                success: false,
                message: "endTime is required",
                field: "endTime",
            });
        }
        if (!category || !category.trim()) {
            return res.status(400).json({
                success: false,
                message: "category is required",
                field: "category",
            });
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
            return res.status(400).json({
                success: false,
                message: "endTime must be after startTime",
                field: "endTime",
            });
        }
        const duration = Math.round((end.getTime() - start.getTime()) / 60000);
        const today = getStartOfDay(new Date());
        const focusDoc = await DashboardData_1.FocusSession.findOneAndUpdate({ userId, date: today }, {
            $setOnInsert: { userId, date: today, totalMinutes: 0, sessions: [] },
            $push: {
                sessions: {
                    startTime: start,
                    endTime: end,
                    duration,
                    category: category.trim(),
                },
            },
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
        const weeklyGoalDoc = await DashboardData_1.WeeklyGoal.findOneAndUpdate({ userId, weekStart }, {
            userId,
            weekStart,
            completedWorkouts,
            goalWorkouts,
            progressPercentage,
        }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
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
// Week starts on Sunday in server local timezone.
function getStartOfWeek(date) {
    const weekStart = getStartOfDay(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return weekStart;
}
function calculatePercentage(part, total) {
    if (!total || total <= 0) {
        return 0;
    }
    return Math.min(Math.round((part / total) * 100), 100);
}
const SECTION_COUNT = 4;
const PTS = 100 / SECTION_COUNT;
function calculateTodayScore(water, focus, streak, weekGoal) {
    const waterScore = Math.min(water.glassesConsumed / Math.max(water.goalGlasses, 1), 1) * PTS;
    const focusScore = Math.min(focus.totalMinutes / 120, 1) * PTS;
    const streakScore = streak.currentStreak > 0 ? PTS : 0;
    const weeklyScore = Math.min(weekGoal.progressPercentage / 100, 1) * PTS;
    return Math.min(Math.round(waterScore + focusScore + streakScore + weeklyScore), 100);
}
function buildWeekDays(now) {
    const weekStart = getStartOfWeek(now);
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return {
            date,
            dateKey: date.toISOString().split("T")[0],
            day: dayLabels[date.getDay()],
            start: new Date(date),
            end: new Date(date.getTime() + 24 * 60 * 60 * 1000),
        };
    });
}
async function getWeeklyStatsOptimized(userId, now) {
    const objectUserId = new mongoose_1.default.Types.ObjectId(userId);
    const days = buildWeekDays(now);
    const weekStart = days[0].start;
    const weekEnd = days[6].end;
    const [workoutAgg, focusAgg] = await Promise.all([
        Workout_1.default.aggregate([
            {
                $match: {
                    userId: objectUserId,
                    createdAt: { $gte: weekStart, $lt: weekEnd },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
        ]),
        DashboardData_1.FocusSession.aggregate([
            {
                $match: {
                    userId: objectUserId,
                    date: { $gte: weekStart, $lt: weekEnd },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date" },
                    },
                    totalMinutes: { $sum: "$totalMinutes" },
                },
            },
        ]),
    ]);
    const workoutMap = Object.fromEntries(workoutAgg.map((item) => [item._id, item.count]));
    const focusMap = Object.fromEntries(focusAgg.map((item) => [item._id, item.totalMinutes]));
    return days.map((day) => ({
        date: day.dateKey,
        day: day.day,
        workouts: workoutMap[day.dateKey] ?? 0,
        focusMinutes: focusMap[day.dateKey] ?? 0,
    }));
}
async function ensureWorkoutStreak(userId) {
    const existing = await DashboardData_1.WorkoutStreak.findOne({ userId }).lean();
    if (existing) {
        return existing;
    }
    return DashboardData_1.WorkoutStreak.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
    });
}
async function ensureWaterIntake(userId, date) {
    const existing = await DashboardData_1.WaterIntake.findOne({ userId, date }).lean();
    if (existing) {
        return existing;
    }
    return DashboardData_1.WaterIntake.create({
        userId,
        date,
        glassesConsumed: 0,
        goalGlasses: 8,
    });
}
async function ensureFocusSession(userId, date) {
    const existing = await DashboardData_1.FocusSession.findOne({ userId, date }).lean();
    if (existing) {
        return existing;
    }
    return DashboardData_1.FocusSession.create({
        userId,
        date,
        totalMinutes: 0,
        sessions: [],
    });
}
async function ensureWeeklyGoal(userId, weekStart) {
    const existing = await DashboardData_1.WeeklyGoal.findOne({ userId, weekStart }).lean();
    if (existing) {
        return existing;
    }
    return DashboardData_1.WeeklyGoal.create({
        userId,
        weekStart,
        completedWorkouts: 0,
        goalWorkouts: 5,
        progressPercentage: 0,
        totalWorkouts: 0,
    });
}
function buildDailyStatsFromInput(weekStart, dailyStats) {
    return dailyStats.slice(0, 7).map((stat, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return {
            date,
            workouts: stat.workouts,
            focusMinutes: stat.focusMinutes,
        };
    });
}
async function ensureWeeklyStatsDoc(userId, weekStart) {
    const existing = await WeeklyStats_1.default.findOne({ userId, weekStart }).lean();
    if (existing) {
        return existing;
    }
    const dailyStats = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return { date, workouts: 0, focusMinutes: 0 };
    });
    return WeeklyStats_1.default.create({
        userId,
        weekStart,
        workouts: 0,
        focusMinutes: 0,
        dailyStats,
    });
}
