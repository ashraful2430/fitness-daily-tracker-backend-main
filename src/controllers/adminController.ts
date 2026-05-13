import { Response } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import Workout from "../models/Workout";
import LearningSession from "../models/LearningSession";
import Income from "../models/Income";
import Expense from "../models/Expense";
import Savings from "../models/Savings";
import Loan from "../models/Loan";
import Lending from "../models/Lending";
import { ScoreSection } from "../models/ScoreSection";
import { AuthRequest } from "../middleware/authMiddleware";
import { getCanonicalFinanceSummary } from "../services/canonicalFinanceSummaryService";

function parsePagination(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return fallback;
  }
  return n;
}

export async function getAdminUsers(req: AuthRequest, res: Response) {
  try {
    const page = parsePagination(req.query.page, 1);
    const limit = Math.min(parsePagination(req.query.limit, 20), 100);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("name email role isBlocked blockedReason lastLoginDate loginStreak longestLoginStreak createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: users.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked ?? false,
        blockedReason: user.blockedReason ?? null,
        loginStreak: user.loginStreak ?? 0,
        longestLoginStreak: user.longestLoginStreak ?? 0,
        lastLoginDate: user.lastLoginDate ?? null,
        createdAt: user.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  try {
    const userId =
      typeof req.params.userId === "string"
        ? req.params.userId
        : req.params.userId?.[0];
    const { role } = req.body as { role?: "user" | "admin" };

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
        field: "userId",
      });
    }
    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "role must be either user or admin",
        field: "role",
      });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true },
    )
      .select("name email role")
      .lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: String(updated._id),
        name: updated.name,
        email: updated.email,
        role: updated.role,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
}

export async function setUserBlockStatus(req: AuthRequest, res: Response) {
  try {
    const userId =
      typeof req.params.userId === "string"
        ? req.params.userId
        : req.params.userId?.[0];
    const { isBlocked, reason } = req.body as {
      isBlocked?: boolean;
      reason?: string;
    };

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
        field: "userId",
      });
    }
    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isBlocked must be boolean",
        field: "isBlocked",
      });
    }
    if (isBlocked && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: "reason is required when blocking a user",
        field: "reason",
      });
    }

    const update = isBlocked
      ? {
          isBlocked: true,
          blockedReason: reason?.trim(),
          blockedAt: new Date(),
          blockedBy: req.userId ?? null,
        }
      : {
          isBlocked: false,
          blockedReason: null,
          blockedAt: null,
          blockedBy: null,
        };

    const updated = await User.findByIdAndUpdate(userId, update, { new: true })
      .select("name email role isBlocked blockedReason blockedAt")
      .lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: String(updated._id),
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isBlocked: updated.isBlocked ?? false,
        blockedReason: updated.blockedReason ?? null,
        blockedAt: updated.blockedAt ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
}

export async function getUserAdminSummary(req: AuthRequest, res: Response) {
  try {
    const userId =
      typeof req.params.userId === "string"
        ? req.params.userId
        : req.params.userId?.[0];
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
        field: "userId",
      });
    }

    const user = await User.findById(userId)
      .select("name email role isBlocked blockedReason blockedAt lastLoginDate loginStreak longestLoginStreak createdAt")
      .lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);
    const idAsString = userId;

    const [
      workoutCount,
      workoutsThisMonth,
      learningCount,
      completedLearningCount,
      sectionCountToday,
      sectionCompletedToday,
      incomeAgg,
      expenseAgg,
      savingsAgg,
      loanStats,
      lendingStats,
      financeSummary,
    ] = await Promise.all([
      Workout.countDocuments({ userId: objectUserId }),
      Workout.countDocuments({ userId: objectUserId, createdAt: { $gte: startOfMonth(new Date()) } }),
      LearningSession.countDocuments({ userId: idAsString }),
      LearningSession.countDocuments({ userId: idAsString, status: "completed" }),
      ScoreSection.countDocuments({ userId: objectUserId, date: startOfDay(new Date()) }),
      ScoreSection.countDocuments({
        userId: objectUserId,
        date: startOfDay(new Date()),
        $expr: { $gte: ["$currentValue", "$goalValue"] },
      }),
      Income.aggregate([{ $match: { userId: idAsString } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $match: { userId: idAsString } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Savings.aggregate([{ $match: { userId: idAsString } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Loan.aggregate([
        { $match: { userId: idAsString } },
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $in: ["$status", ["ACTIVE", "PARTIAL"]] }, 1, 0] } },
            total: { $sum: 1 },
          },
        },
      ]),
      Lending.aggregate([
        { $match: { userId: idAsString } },
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $in: ["$status", ["ACTIVE", "PARTIALLY_REPAID"]] }, 1, 0] } },
            total: { $sum: 1 },
          },
        },
      ]),
      getCanonicalFinanceSummary(idAsString),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          isBlocked: user.isBlocked ?? false,
          blockedReason: user.blockedReason ?? null,
          blockedAt: user.blockedAt ?? null,
          createdAt: user.createdAt,
          lastLoginDate: user.lastLoginDate ?? null,
          loginStreak: user.loginStreak ?? 0,
          longestLoginStreak: user.longestLoginStreak ?? 0,
        },
        summary: {
          workouts: {
            total: workoutCount,
            thisMonth: workoutsThisMonth,
          },
          learning: {
            totalSessions: learningCount,
            completedSessions: completedLearningCount,
          },
          scoreSections: {
            totalToday: sectionCountToday,
            completedToday: sectionCompletedToday,
          },
          finance: {
            totalIncome: incomeAgg[0]?.total ?? 0,
            totalExpense: expenseAgg[0]?.total ?? 0,
            totalSavings: savingsAgg[0]?.total ?? 0,
            availableBalance: financeSummary.availableBalance ?? 0,
            loanDebt: financeSummary.loanDebt ?? 0,
          },
          loans: {
            active: loanStats[0]?.active ?? 0,
            total: loanStats[0]?.total ?? 0,
          },
          lending: {
            active: lendingStats[0]?.active ?? 0,
            total: lendingStats[0]?.total ?? 0,
          },
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return res.status(500).json({ success: false, message });
  }
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
