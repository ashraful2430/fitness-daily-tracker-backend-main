import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  WorkoutStreak,
  WaterIntake,
  FocusSession,
  WeeklyGoal,
} from "../models/DashboardData";
import Workout from "../models/Workout";
import { getAnalyticsInsights } from "../services/analyticsService";
import WeeklyStats from "../models/WeeklyStats"; // Import the WeeklyStats model

// ─── GET /api/dashboard ───────────────────────────────────────────────────────
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const today = getStartOfDay(new Date());
    const weekStart = getStartOfWeek(today);

    const [
      workoutStreak,
      waterIntake,
      focusSession,
      weeklyGoal,
      recentWorkouts,
      weeklyStats,
      analyticsInsights,
    ] = await Promise.all([
      WorkoutStreak.findOne({ userId }).lean(),

      WaterIntake.findOne({ userId, date: today }).lean(),

      FocusSession.findOne({ userId, date: today }).lean(),

      WeeklyGoal.findOne({ userId, weekStart }).lean(),

      Workout.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("exercise duration calories createdAt")
        .lean(),

      getWeeklyStatsOptimized(userId),

      getAnalyticsInsights(userId),
    ]);

    const streak =
      workoutStreak ??
      (await WorkoutStreak.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
      }));

    const water =
      waterIntake ??
      (await WaterIntake.create({
        userId,
        date: today,
        glassesConsumed: 0,
        goalGlasses: 8,
      }));

    const focus =
      focusSession ??
      (await FocusSession.create({
        userId,
        date: today,
        totalMinutes: 0,
        sessions: [],
      }));

    const weekGoal =
      weeklyGoal ??
      (await WeeklyGoal.create({
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
          percentage: Math.round(
            (water.glassesConsumed / water.goalGlasses) * 100,
          ),
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// ─── GET /api/dashboard/weekly-stats ────────────────────────────────────────────────
export const getWeeklyStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const weeklyStats = await getWeeklyStatsOptimized(userId);

    return res.status(200).json({
      success: true,
      data: weeklyStats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// ─── POST /api/dashboard/weekly-stats ────────────────────────────────────────────────
export const updateWeeklyStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { dailyStats } = req.body; // Expecting an array of daily stats

    const weekStart = getStartOfWeek(new Date());

    let totalWorkouts = 0;
    let totalFocusMinutes = 0;

    // Aggregate the workouts and focus minutes from the daily stats
    dailyStats.forEach((stat: { workouts: number; focusMinutes: number }) => {
      totalWorkouts += stat.workouts;
      totalFocusMinutes += stat.focusMinutes;
    });

    const weeklyStats = await WeeklyStats.findOneAndUpdate(
      { userId, weekStart },
      { dailyStats, workouts: totalWorkouts, focusMinutes: totalFocusMinutes },
      { new: true, upsert: true },
    ).lean();

    return res.status(200).json({
      success: true,
      data: weeklyStats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// ─── POST /api/dashboard/water ────────────────────────────────────────────────
export const updateWaterIntake = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { glassesConsumed } = req.body as {
      glassesConsumed: number;
    };

    const today = getStartOfDay(new Date());

    const waterIntake = await WaterIntake.findOneAndUpdate(
      { userId, date: today },
      { glassesConsumed },
      {
        new: true,
        upsert: true,
      },
    ).lean();

    return res.status(200).json({
      success: true,
      data: waterIntake,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// ─── POST /api/dashboard/focus ────────────────────────────────────────────────
export const logFocusSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const { startTime, endTime, category } = req.body as {
      startTime: string;
      endTime: string;
      category: string;
    };

    const start = new Date(startTime);
    const end = new Date(endTime);

    const duration = Math.round((end.getTime() - start.getTime()) / 60000);

    const today = getStartOfDay(new Date());

    const focusSession = await FocusSession.findOneAndUpdate(
      { userId, date: today },
      {
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
      },
      {
        new: true,
        upsert: true,
      },
    ).lean();

    return res.status(200).json({
      success: true,
      data: focusSession,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// ─── POST /api/dashboard/weekly-goal ─────────────────────────────────────────
export const updateWeeklyGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const { completedWorkouts, goalWorkouts } = req.body as {
      completedWorkouts: number;
      goalWorkouts: number;
    };

    const weekStart = getStartOfWeek(new Date());

    const progressPercentage = Math.round(
      (completedWorkouts / goalWorkouts) * 100,
    );

    const weeklyGoal = await WeeklyGoal.findOneAndUpdate(
      { userId, weekStart },
      {
        completedWorkouts,
        goalWorkouts,
        progressPercentage,
      },
      {
        new: true,
        upsert: true,
      },
    ).lean();

    return res.status(200).json({
      success: true,
      data: weeklyGoal,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStartOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getStartOfWeek(date: Date) {
  const weekStart = getStartOfDay(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}

const SECTION_COUNT = 4;
const PTS = 100 / SECTION_COUNT;

function calculateTodayScore(
  water: any,
  focus: any,
  streak: any,
  weekGoal?: any,
): number {
  const waterScore =
    Math.min(water.glassesConsumed / water.goalGlasses, 1) * PTS;

  const focusScore = Math.min(focus.totalMinutes / 120, 1) * PTS;

  const streakScore = streak.currentStreak > 0 ? PTS : 0;

  const weeklyScore = weekGoal
    ? Math.min(weekGoal.progressPercentage / 100, 1) * PTS
    : 0;

  return Math.min(
    Math.round(waterScore + focusScore + streakScore + weeklyScore),
    100,
  );
}

// ─── Weekly Stats Optimized ───────────────────────────────────────────────────
async function getWeeklyStatsOptimized(userId: string) {
  const objectUserId = new mongoose.Types.ObjectId(userId);
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
    Workout.aggregate([
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

    FocusSession.aggregate([
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

  const workoutMap = Object.fromEntries(
    workoutAgg.map((w) => [w._id, w.count]),
  );

  const focusMap = Object.fromEntries(
    focusAgg.map((f) => [f._id, f.totalMinutes]),
  );

  return days.map(({ dateStr, day }) => ({
    date: dateStr,
    day,
    workouts: workoutMap[dateStr] ?? 0,
    focusMinutes: focusMap[dateStr] ?? 0,
  }));
}
