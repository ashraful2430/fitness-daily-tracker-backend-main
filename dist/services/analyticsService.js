"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDailyAnalytics = updateDailyAnalytics;
exports.getAnalyticsInsights = getAnalyticsInsights;
const mongoose_1 = __importDefault(require("mongoose"));
const DailyAnalytics_1 = __importDefault(require("../models/DailyAnalytics"));
function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}
function calculateScore({ loginCompleted, focusMinutes, workouts, completedSections, totalSections, }) {
    const SECTION_COUNT = 4;
    const PTS = 100 / SECTION_COUNT;
    const loginScore = loginCompleted ? PTS : 0;
    const focusScore = Math.min(focusMinutes / 120, 1) * PTS;
    const workoutScore = workouts > 0 ? PTS : 0;
    const sectionScore = totalSections > 0
        ? Math.min(completedSections / totalSections, 1) * PTS
        : 0;
    return Math.min(Math.round(loginScore + focusScore + workoutScore + sectionScore), 100);
}
async function updateDailyAnalytics(userId, updates) {
    const today = startOfDay(new Date());
    let analytics = await DailyAnalytics_1.default.findOne({
        userId,
        date: today,
    });
    if (!analytics) {
        analytics = await DailyAnalytics_1.default.create({
            userId,
            date: today,
            loginCompleted: false,
            score: 0,
            focusMinutes: 0,
            workouts: 0,
            completedSections: 0,
            totalSections: 0,
            perfectDay: false,
        });
    }
    if (typeof updates.loginCompleted === "boolean") {
        analytics.loginCompleted = updates.loginCompleted;
    }
    if (typeof updates.focusMinutes === "number") {
        analytics.focusMinutes += updates.focusMinutes;
    }
    if (typeof updates.workouts === "number") {
        analytics.workouts += updates.workouts;
    }
    if (typeof updates.completedSections === "number") {
        analytics.completedSections = updates.completedSections;
    }
    if (typeof updates.totalSections === "number") {
        analytics.totalSections = updates.totalSections;
    }
    analytics.score = calculateScore({
        loginCompleted: analytics.loginCompleted,
        focusMinutes: analytics.focusMinutes,
        workouts: analytics.workouts,
        completedSections: analytics.completedSections,
        totalSections: analytics.totalSections,
    });
    analytics.perfectDay = analytics.score === 100;
    await analytics.save();
    return analytics;
}
async function getAnalyticsInsights(userId) {
    const objectUserId = new mongoose_1.default.Types.ObjectId(userId);
    const [summaryAgg, recentAnalytics] = await Promise.all([
        DailyAnalytics_1.default.aggregate([
            { $match: { userId: objectUserId } },
            {
                $group: {
                    _id: null,
                    totalDays: { $sum: 1 },
                    perfectDays: {
                        $sum: {
                            $cond: ["$perfectDay", 1, 0],
                        },
                    },
                    missedDays: {
                        $sum: {
                            $cond: [{ $eq: ["$score", 0] }, 1, 0],
                        },
                    },
                    bestScore: { $max: "$score" },
                },
            },
        ]),
        DailyAnalytics_1.default.find({ userId: objectUserId })
            .sort({ date: -1 })
            .limit(14)
            .select("score")
            .lean(),
    ]);
    const summary = summaryAgg[0];
    if (!summary) {
        return {
            perfectDays: 0,
            missedDays: 0,
            bestScore: 0,
            weeklyAverageScore: 0,
            productivityTrend: "stable",
        };
    }
    const last7Days = recentAnalytics.slice(0, 7);
    const previous7Days = recentAnalytics.slice(7, 14);
    const weeklyAverageScore = last7Days.length
        ? Math.round(last7Days.reduce((sum, day) => sum + day.score, 0) / last7Days.length)
        : 0;
    const previousAverage = previous7Days.length
        ? previous7Days.reduce((sum, day) => sum + day.score, 0) /
            previous7Days.length
        : weeklyAverageScore;
    let productivityTrend = "stable";
    if (weeklyAverageScore > previousAverage + 5) {
        productivityTrend = "up";
    }
    else if (weeklyAverageScore < previousAverage - 5) {
        productivityTrend = "down";
    }
    return {
        perfectDays: summary.perfectDays,
        missedDays: summary.missedDays,
        bestScore: summary.bestScore ?? 0,
        weeklyAverageScore,
        productivityTrend,
    };
}
