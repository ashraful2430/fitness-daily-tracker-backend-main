import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  WorkoutStreak,
  WaterIntake,
  FocusSession,
  WeeklyGoal,
} from "../models/DashboardData";
import Workout from "../models/Workout";
import WeeklyStats from "../models/WeeklyStats";
import { getAnalyticsInsights } from "../services/analyticsService";

type AuthedRequest = Request & { userId?: string };

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).userId;
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
      Workout.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("exercise duration calories createdAt")
        .lean(),
      getWeeklyStatsOptimized(userId, now),
      getAnalyticsInsights(userId),
    ]);

    const waterPercentage = calculatePercentage(
      water.glassesConsumed,
      water.goalGlasses,
    );
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

    const now = new Date();
    const weekStart = getStartOfWeek(now);
    await ensureWeeklyStatsDoc(userId, weekStart);

    const weeklyStats = await getWeeklyStatsOptimized(userId, now);
    return res.status(200).json({ success: true, data: weeklyStats });
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

    const now = new Date();
    const weekStart = getStartOfWeek(now);

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
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
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
        percentage: calculatePercentage(
          waterDoc.glassesConsumed,
          waterDoc.goalGlasses,
        ),
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

    const focusDoc = await FocusSession.findOneAndUpdate(
      { userId, date: today },
      {
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

    const { completedWorkouts, goalWorkouts } = req.body as {
      completedWorkouts?: number;
      goalWorkouts?: number;
    };

    if (
      typeof completedWorkouts !== "number" ||
      completedWorkouts < 0 ||
      typeof goalWorkouts !== "number" ||
      goalWorkouts <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "completedWorkouts must be non-negative and goalWorkouts must be greater than 0",
        field: "completedWorkouts",
      });
    }

    const weekStart = getStartOfWeek(new Date());
    const progressPercentage = calculatePercentage(
      completedWorkouts,
      goalWorkouts,
    );

    const weeklyGoalDoc = await WeeklyGoal.findOneAndUpdate(
      { userId, weekStart },
      {
        userId,
        weekStart,
        completedWorkouts,
        goalWorkouts,
        progressPercentage,
      },
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

// Week starts on Sunday in server local timezone.
function getStartOfWeek(date: Date) {
  const weekStart = getStartOfDay(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}

function calculatePercentage(part: number, total: number) {
  if (!total || total <= 0) {
    return 0;
  }
  return Math.min(Math.round((part / total) * 100), 100);
}

const SECTION_COUNT = 4;
const PTS = 100 / SECTION_COUNT;

function calculateTodayScore(
  water: { glassesConsumed: number; goalGlasses: number },
  focus: { totalMinutes: number },
  streak: { currentStreak: number },
  weekGoal: { progressPercentage: number },
) {
  const waterScore =
    Math.min(water.glassesConsumed / Math.max(water.goalGlasses, 1), 1) * PTS;
  const focusScore = Math.min(focus.totalMinutes / 120, 1) * PTS;
  const streakScore = streak.currentStreak > 0 ? PTS : 0;
  const weeklyScore = Math.min(weekGoal.progressPercentage / 100, 1) * PTS;

  return Math.min(Math.round(waterScore + focusScore + streakScore + weeklyScore), 100);
}

function buildWeekDays(now: Date) {
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

async function getWeeklyStatsOptimized(userId: string, now: Date) {
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const days = buildWeekDays(now);
  const weekStart = days[0].start;
  const weekEnd = days[6].end;

  const [workoutAgg, focusAgg] = await Promise.all([
    Workout.aggregate([
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
    FocusSession.aggregate([
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
  const focusMap = Object.fromEntries(
    focusAgg.map((item) => [item._id, item.totalMinutes]),
  );

  return days.map((day) => ({
    date: day.dateKey,
    day: day.day,
    workouts: workoutMap[day.dateKey] ?? 0,
    focusMinutes: focusMap[day.dateKey] ?? 0,
  }));
}

async function ensureWorkoutStreak(userId: string) {
  const existing = await WorkoutStreak.findOne({ userId }).lean();
  if (existing) {
    return existing;
  }
  return WorkoutStreak.create({
    userId,
    currentStreak: 0,
    longestStreak: 0,
  });
}

async function ensureWaterIntake(userId: string, date: Date) {
  const existing = await WaterIntake.findOne({ userId, date }).lean();
  if (existing) {
    return existing;
  }
  return WaterIntake.create({
    userId,
    date,
    glassesConsumed: 0,
    goalGlasses: 8,
  });
}

async function ensureFocusSession(userId: string, date: Date) {
  const existing = await FocusSession.findOne({ userId, date }).lean();
  if (existing) {
    return existing;
  }
  return FocusSession.create({
    userId,
    date,
    totalMinutes: 0,
    sessions: [],
  });
}

async function ensureWeeklyGoal(userId: string, weekStart: Date) {
  const existing = await WeeklyGoal.findOne({ userId, weekStart }).lean();
  if (existing) {
    return existing;
  }
  return WeeklyGoal.create({
    userId,
    weekStart,
    completedWorkouts: 0,
    goalWorkouts: 5,
    progressPercentage: 0,
    totalWorkouts: 0,
  });
}

function buildDailyStatsFromInput(
  weekStart: Date,
  dailyStats: Array<{ workouts: number; focusMinutes: number }>,
) {
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

async function ensureWeeklyStatsDoc(userId: string, weekStart: Date) {
  const existing = await WeeklyStats.findOne({ userId, weekStart }).lean();
  if (existing) {
    return existing;
  }

  const dailyStats = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return { date, workouts: 0, focusMinutes: 0 };
  });

  return WeeklyStats.create({
    userId,
    weekStart,
    workouts: 0,
    focusMinutes: 0,
    dailyStats,
  });
}
