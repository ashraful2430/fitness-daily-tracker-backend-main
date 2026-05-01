"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLearningSession = createLearningSession;
exports.updateLearningSession = updateLearningSession;
exports.deleteLearningSession = deleteLearningSession;
exports.listLearningSessions = listLearningSessions;
exports.getLearningSummary = getLearningSummary;
const LearningSession_1 = __importDefault(require("../models/LearningSession"));
function getTodayDateString() {
    return new Date().toISOString().slice(0, 10);
}
function getStartOfWeekDateString() {
    const today = new Date();
    const day = today.getDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    today.setDate(today.getDate() - distanceFromMonday);
    today.setHours(0, 0, 0, 0);
    return today.toISOString().slice(0, 10);
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildSessionQuery(userId, filters) {
    const query = { userId };
    if (filters?.status) {
        query.status = filters.status;
    }
    if (filters?.subject) {
        query.subject = {
            $regex: escapeRegex(filters.subject),
            $options: "i",
        };
    }
    if (filters?.startDate || filters?.endDate) {
        query.date = {};
        if (filters.startDate) {
            query.date.$gte = filters.startDate;
        }
        if (filters.endDate) {
            query.date.$lte = filters.endDate;
        }
    }
    return query;
}
async function ensureNoOtherActiveSession(userId, sessionId) {
    const existingActiveSession = await LearningSession_1.default.findOne({
        userId,
        status: "active",
        ...(sessionId ? { _id: { $ne: sessionId } } : {}),
    });
    return existingActiveSession;
}
async function createLearningSession(userId, input) {
    const status = input.status ?? "planned";
    if (status === "active") {
        const existingActiveSession = await ensureNoOtherActiveSession(userId);
        if (existingActiveSession) {
            return {
                error: "Another learning session is already active.",
                status: 409,
            };
        }
    }
    const createdSession = await LearningSession_1.default.create({
        userId,
        title: input.title,
        subject: input.subject,
        plannedMinutes: input.plannedMinutes,
        actualMinutes: input.actualMinutes ?? 0,
        status,
        notes: input.notes,
        date: input.date,
        startedAt: input.startedAt ?? null,
        completedAt: input.completedAt ?? null,
    });
    return { data: createdSession };
}
async function updateLearningSession(userId, sessionId, updates) {
    if (updates.status === "active") {
        const existingActiveSession = await ensureNoOtherActiveSession(userId, sessionId);
        if (existingActiveSession) {
            return {
                error: "Another learning session is already active.",
                status: 409,
            };
        }
    }
    const updatedSession = await LearningSession_1.default.findOneAndUpdate({ _id: sessionId, userId }, updates, {
        new: true,
        runValidators: true,
    });
    if (!updatedSession) {
        return {
            error: "Learning session not found.",
            status: 404,
        };
    }
    return { data: updatedSession };
}
async function deleteLearningSession(userId, sessionId) {
    const deletedSession = await LearningSession_1.default.findOneAndDelete({
        _id: sessionId,
        userId,
    });
    if (!deletedSession) {
        return {
            error: "Learning session not found.",
            status: 404,
        };
    }
    return {
        data: {
            deleted: true,
        },
    };
}
async function listLearningSessions(userId, filters) {
    const query = buildSessionQuery(userId, filters);
    const skip = (filters.page - 1) * filters.limit;
    const [sessions, total] = await Promise.all([
        LearningSession_1.default.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(filters.limit),
        LearningSession_1.default.countDocuments(query),
    ]);
    return {
        data: sessions,
        pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
        },
    };
}
function computeCurrentStreak(sessions) {
    const qualifyingDates = new Set(sessions
        .filter((session) => session.status === "completed" || session.actualMinutes > 0)
        .map((session) => session.date));
    if (qualifyingDates.size === 0) {
        return 0;
    }
    let streak = 0;
    let cursor = new Date();
    while (true) {
        const dateKey = cursor.toISOString().slice(0, 10);
        if (!qualifyingDates.has(dateKey)) {
            break;
        }
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}
async function getLearningSummary(userId) {
    const today = getTodayDateString();
    const weekStart = getStartOfWeekDateString();
    const [todayAgg, weekAgg, totalAgg, totalSessions, completedSessions, activeSession, topSubjects, recentSessions, streakSessions] = await Promise.all([
        LearningSession_1.default.aggregate([
            { $match: { userId, date: today } },
            { $group: { _id: null, totalMinutes: { $sum: "$actualMinutes" } } },
        ]),
        LearningSession_1.default.aggregate([
            { $match: { userId, date: { $gte: weekStart, $lte: today } } },
            { $group: { _id: null, totalMinutes: { $sum: "$actualMinutes" } } },
        ]),
        LearningSession_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, totalMinutes: { $sum: "$actualMinutes" } } },
        ]),
        LearningSession_1.default.countDocuments({ userId }),
        LearningSession_1.default.countDocuments({ userId, status: "completed" }),
        LearningSession_1.default.findOne({ userId, status: "active" }).sort({ updatedAt: -1 }),
        LearningSession_1.default.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: "$subject",
                    totalMinutes: { $sum: "$actualMinutes" },
                    sessionCount: { $sum: 1 },
                },
            },
            { $sort: { totalMinutes: -1, sessionCount: -1, _id: 1 } },
            { $limit: 5 },
        ]),
        LearningSession_1.default.find({ userId })
            .sort({ updatedAt: -1, date: -1 })
            .limit(5),
        LearningSession_1.default.find({ userId })
            .select("date status actualMinutes")
            .lean(),
    ]);
    const todayMinutes = todayAgg[0]?.totalMinutes ?? 0;
    const weekMinutes = weekAgg[0]?.totalMinutes ?? 0;
    const totalMinutes = totalAgg[0]?.totalMinutes ?? 0;
    return {
        data: {
            todayMinutes,
            weekMinutes,
            totalMinutes,
            totalSessions,
            completedSessions,
            completionRate: totalSessions === 0
                ? 0
                : Math.round((completedSessions / totalSessions) * 100),
            currentStreak: computeCurrentStreak(streakSessions),
            activeSession: activeSession ?? null,
            topSubjects,
            recentSessions,
        },
    };
}
