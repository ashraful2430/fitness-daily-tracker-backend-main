"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminUsers = getAdminUsers;
exports.updateUserRole = updateUserRole;
exports.setUserBlockStatus = setUserBlockStatus;
exports.getUserAdminSummary = getUserAdminSummary;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Workout_1 = __importDefault(require("../models/Workout"));
const LearningSession_1 = __importDefault(require("../models/LearningSession"));
const Income_1 = __importDefault(require("../models/Income"));
const Expense_1 = __importDefault(require("../models/Expense"));
const Savings_1 = __importDefault(require("../models/Savings"));
const Loan_1 = __importDefault(require("../models/Loan"));
const Lending_1 = __importDefault(require("../models/Lending"));
const ScoreSection_1 = require("../models/ScoreSection");
const canonicalFinanceSummaryService_1 = require("../services/canonicalFinanceSummaryService");
function parsePagination(value, fallback) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
        return fallback;
    }
    return n;
}
async function getAdminUsers(req, res) {
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
            User_1.default.find(filter)
                .select("name email role isBlocked blockedReason lastLoginDate loginStreak longestLoginStreak createdAt")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            User_1.default.countDocuments(filter),
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
}
async function updateUserRole(req, res) {
    try {
        const userId = typeof req.params.userId === "string"
            ? req.params.userId
            : req.params.userId?.[0];
        const { role } = req.body;
        if (!userId || !mongoose_1.default.Types.ObjectId.isValid(userId)) {
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
        const updated = await User_1.default.findByIdAndUpdate(userId, { role }, { new: true })
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
}
async function setUserBlockStatus(req, res) {
    try {
        const userId = typeof req.params.userId === "string"
            ? req.params.userId
            : req.params.userId?.[0];
        const { isBlocked, reason } = req.body;
        if (!userId || !mongoose_1.default.Types.ObjectId.isValid(userId)) {
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
        const updated = await User_1.default.findByIdAndUpdate(userId, update, { new: true })
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
}
async function getUserAdminSummary(req, res) {
    try {
        const userId = typeof req.params.userId === "string"
            ? req.params.userId
            : req.params.userId?.[0];
        if (!userId || !mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid userId",
                field: "userId",
            });
        }
        const user = await User_1.default.findById(userId)
            .select("name email role isBlocked blockedReason blockedAt lastLoginDate loginStreak longestLoginStreak createdAt")
            .lean();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const objectUserId = new mongoose_1.default.Types.ObjectId(userId);
        const idAsString = userId;
        const [workoutCount, workoutsThisMonth, learningCount, completedLearningCount, sectionCountToday, sectionCompletedToday, incomeAgg, expenseAgg, savingsAgg, loanStats, lendingStats, financeSummary,] = await Promise.all([
            Workout_1.default.countDocuments({ userId: objectUserId }),
            Workout_1.default.countDocuments({ userId: objectUserId, createdAt: { $gte: startOfMonth(new Date()) } }),
            LearningSession_1.default.countDocuments({ userId: idAsString }),
            LearningSession_1.default.countDocuments({ userId: idAsString, status: "completed" }),
            ScoreSection_1.ScoreSection.countDocuments({ userId: objectUserId, date: startOfDay(new Date()) }),
            ScoreSection_1.ScoreSection.countDocuments({
                userId: objectUserId,
                date: startOfDay(new Date()),
                $expr: { $gte: ["$currentValue", "$goalValue"] },
            }),
            Income_1.default.aggregate([{ $match: { userId: idAsString } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            Expense_1.default.aggregate([{ $match: { userId: idAsString } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            Savings_1.default.aggregate([{ $match: { userId: idAsString } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            Loan_1.default.aggregate([
                { $match: { userId: idAsString } },
                {
                    $group: {
                        _id: null,
                        active: { $sum: { $cond: [{ $in: ["$status", ["ACTIVE", "PARTIAL"]] }, 1, 0] } },
                        total: { $sum: 1 },
                    },
                },
            ]),
            Lending_1.default.aggregate([
                { $match: { userId: idAsString } },
                {
                    $group: {
                        _id: null,
                        active: { $sum: { $cond: [{ $in: ["$status", ["ACTIVE", "PARTIALLY_REPAID"]] }, 1, 0] } },
                        total: { $sum: 1 },
                    },
                },
            ]),
            (0, canonicalFinanceSummaryService_1.getCanonicalFinanceSummary)(idAsString),
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Server error";
        return res.status(500).json({ success: false, message });
    }
}
function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}
function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
