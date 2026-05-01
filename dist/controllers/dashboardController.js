"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWeeklyGoal = exports.logFocusSession = exports.updateWaterIntake = exports.updateWeeklyStats = exports.getWeeklyStats = exports.getDashboardData = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const DashboardData_1 = require("../models/DashboardData");
const Workout_1 = __importDefault(require("../models/Workout"));
const analyticsService_1 = require("../services/analyticsService");
const WeeklyStats_1 = __importDefault(require("../models/WeeklyStats")); // Import the WeeklyStats model
// ─── GET /api/dashboard ───────────────────────────────────────────────────────
const getDashboardData = async (req, res) => {
    try {
        const userId = req.userId;
        const today = getStartOfDay(new Date());
        const weekStart = getStartOfWeek(today);
        const [workoutStreak, waterIntake, focusSession, weeklyGoal, recentWorkouts, weeklyStats, analyticsInsights,] = await Promise.all([
            DashboardData_1.WorkoutStreak.findOne({ userId }).lean(),
            DashboardData_1.WaterIntake.findOne({ userId, date: today }).lean(),
            DashboardData_1.FocusSession.findOne({ userId, date: today }).lean(),
            DashboardData_1.WeeklyGoal.findOne({ userId, weekStart }).lean(),
            Workout_1.default.find({ userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select("exercise duration calories createdAt")
                .lean(),
            getWeeklyStatsOptimized(userId),
            (0, analyticsService_1.getAnalyticsInsights)(userId),
        ]);
        const streak = workoutStreak ??
            (await DashboardData_1.WorkoutStreak.create({
                userId,
                currentStreak: 0,
                longestStreak: 0,
            }));
        const water = waterIntake ??
            (await DashboardData_1.WaterIntake.create({
                userId,
                date: today,
                glassesConsumed: 0,
                goalGlasses: 8,
            }));
        const focus = focusSession ??
            (await DashboardData_1.FocusSession.create({
                userId,
                date: today,
                totalMinutes: 0,
                sessions: [],
            }));
        const weekGoal = weeklyGoal ??
            (await DashboardData_1.WeeklyGoal.create({
                userId,
                weekStart,
                totalWorkouts: 0,
                completedWorkouts: 0,
                goalWorkouts: 5,
                progressPercentage: 0,
            }));
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
                    percentage: Math.round((water.glassesConsumed / water.goalGlasses) * 100),
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
                analytics: analyticsInsights,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.getDashboardData = getDashboardData;
// ─── GET /api/dashboard/weekly-stats ────────────────────────────────────────────────
const getWeeklyStats = async (req, res) => {
    try {
        const userId = req.userId;
        const weeklyStats = await getWeeklyStatsOptimized(userId);
        return res.status(200).json({
            success: true,
            data: weeklyStats,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.getWeeklyStats = getWeeklyStats;
// ─── POST /api/dashboard/weekly-stats ────────────────────────────────────────────────
const updateWeeklyStats = async (req, res) => {
    try {
        const userId = req.userId;
        const { dailyStats } = req.body; // Expecting an array of daily stats
        const weekStart = getStartOfWeek(new Date());
        let totalWorkouts = 0;
        let totalFocusMinutes = 0;
        // Aggregate the workouts and focus minutes from the daily stats
        dailyStats.forEach((stat) => {
            totalWorkouts += stat.workouts;
            totalFocusMinutes += stat.focusMinutes;
        });
        const weeklyStats = await WeeklyStats_1.default.findOneAndUpdate({ userId, weekStart }, { dailyStats, workouts: totalWorkouts, focusMinutes: totalFocusMinutes }, { new: true, upsert: true }).lean();
        return res.status(200).json({
            success: true,
            data: weeklyStats,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.updateWeeklyStats = updateWeeklyStats;
// ─── POST /api/dashboard/water ────────────────────────────────────────────────
const updateWaterIntake = async (req, res) => {
    try {
        const userId = req.userId;
        const { glassesConsumed } = req.body;
        const today = getStartOfDay(new Date());
        const waterIntake = await DashboardData_1.WaterIntake.findOneAndUpdate({ userId, date: today }, { glassesConsumed }, {
            new: true,
            upsert: true,
        }).lean();
        return res.status(200).json({
            success: true,
            data: waterIntake,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.updateWaterIntake = updateWaterIntake;
// ─── POST /api/dashboard/focus ────────────────────────────────────────────────
const logFocusSession = async (req, res) => {
    try {
        const userId = req.userId;
        const { startTime, endTime, category } = req.body;
        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = Math.round((end.getTime() - start.getTime()) / 60000);
        const today = getStartOfDay(new Date());
        const focusSession = await DashboardData_1.FocusSession.findOneAndUpdate({ userId, date: today }, {
            $push: {
                sessions: {
                    startTime: start,
                    endTime: end,
                    duration,
                    category,
                },
            },
            $inc: {
                totalMinutes: duration,
            },
        }, {
            new: true,
            upsert: true,
        }).lean();
        return res.status(200).json({
            success: true,
            data: focusSession,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.logFocusSession = logFocusSession;
// ─── POST /api/dashboard/weekly-goal ─────────────────────────────────────────
const updateWeeklyGoal = async (req, res) => {
    try {
        const userId = req.userId;
        const { completedWorkouts, goalWorkouts } = req.body;
        const weekStart = getStartOfWeek(new Date());
        const progressPercentage = Math.round((completedWorkouts / goalWorkouts) * 100);
        const weeklyGoal = await DashboardData_1.WeeklyGoal.findOneAndUpdate({ userId, weekStart }, {
            completedWorkouts,
            goalWorkouts,
            progressPercentage,
        }, {
            new: true,
            upsert: true,
        }).lean();
        return res.status(200).json({
            success: true,
            data: weeklyGoal,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({
            success: false,
            message,
        });
    }
};
exports.updateWeeklyGoal = updateWeeklyGoal;
// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStartOfDay(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}
function getStartOfWeek(date) {
    const weekStart = getStartOfDay(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return weekStart;
}
const SECTION_COUNT = 4;
const PTS = 100 / SECTION_COUNT;
function calculateTodayScore(water, focus, streak, weekGoal) {
    const waterScore = Math.min(water.glassesConsumed / water.goalGlasses, 1) * PTS;
    const focusScore = Math.min(focus.totalMinutes / 120, 1) * PTS;
    const streakScore = streak.currentStreak > 0 ? PTS : 0;
    const weeklyScore = weekGoal
        ? Math.min(weekGoal.progressPercentage / 100, 1) * PTS
        : 0;
    return Math.min(Math.round(waterScore + focusScore + streakScore + weeklyScore), 100);
}
// ─── Weekly Stats Optimized ───────────────────────────────────────────────────
async function getWeeklyStatsOptimized(userId) {
    const objectUserId = new mongoose_1.default.Types.ObjectId(userId);
    const weekStart = getStartOfWeek(new Date());
    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        return {
            dateStr: date.toISOString().split("T")[0],
            day: DAY_LABELS[date.getDay()],
            start: new Date(date),
            end: new Date(date.getTime() + 24 * 60 * 60 * 1000),
        };
    });
    const [workoutAgg, focusAgg] = await Promise.all([
        Workout_1.default.aggregate([
            {
                $match: {
                    userId: objectUserId,
                    createdAt: {
                        $gte: weekStart,
                        $lt: days[6].end,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                        },
                    },
                    count: {
                        $sum: 1,
                    },
                },
            },
        ]),
        DashboardData_1.FocusSession.aggregate([
            {
                $match: {
                    userId: objectUserId,
                    date: {
                        $gte: weekStart,
                        $lt: days[6].end,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$date",
                        },
                    },
                    totalMinutes: {
                        $sum: "$totalMinutes",
                    },
                },
            },
        ]),
    ]);
    const workoutMap = Object.fromEntries(workoutAgg.map((w) => [w._id, w.count]));
    const focusMap = Object.fromEntries(focusAgg.map((f) => [f._id, f.totalMinutes]));
    return days.map(({ dateStr, day }) => ({
        date: dateStr,
        day,
        workouts: workoutMap[dateStr] ?? 0,
        focusMinutes: focusMap[dateStr] ?? 0,
    }));
}
