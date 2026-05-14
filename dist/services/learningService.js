"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_SESSION_STATUSES = void 0;
exports.createSession = createSession;
exports.listSessions = listSessions;
exports.getSessionById = getSessionById;
exports.updateSession = updateSession;
exports.deleteSession = deleteSession;
exports.startSession = startSession;
exports.pauseSession = pauseSession;
exports.resumeSession = resumeSession;
exports.completeSession = completeSession;
exports.cancelSession = cancelSession;
exports.rescheduleSession = rescheduleSession;
exports.getTimerPresets = getTimerPresets;
exports.createTimerPreset = createTimerPreset;
exports.updateTimerPreset = updateTimerPreset;
exports.deleteTimerPreset = deleteTimerPreset;
exports.getTemplates = getTemplates;
exports.createTemplate = createTemplate;
exports.getGoals = getGoals;
exports.upsertGoals = upsertGoals;
exports.getStats = getStats;
exports.getChildControls = getChildControls;
exports.upsertChildControls = upsertChildControls;
exports.listSessionNotes = listSessionNotes;
exports.createSessionNote = createSessionNote;
exports.updateNote = updateNote;
exports.deleteNote = deleteNote;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const LearningSession_1 = __importStar(require("../models/LearningSession"));
Object.defineProperty(exports, "LEARNING_SESSION_STATUSES", { enumerable: true, get: function () { return LearningSession_1.LEARNING_SESSION_STATUSES; } });
const TimerPreset_1 = __importDefault(require("../models/TimerPreset"));
const LearningTemplate_1 = __importDefault(require("../models/LearningTemplate"));
const LearningGoal_1 = __importDefault(require("../models/LearningGoal"));
const ChildLearningControl_1 = __importDefault(require("../models/ChildLearningControl"));
const LearningNote_1 = __importDefault(require("../models/LearningNote"));
const DEFAULT_TIMER_MINUTES = [1, 2, 5, 10, 15, 25, 45, 60, 90];
const DEFAULT_TEMPLATES = [
    { name: "DSA Practice", learnerMode: "student", title: "DSA Practice", subject: "Computer Science", goal: "Solve 2-3 algorithm problems", plannedMinutes: 60, learningType: "practice", difficulty: "hard", priority: "high", notesPlaceholder: "Key patterns, mistakes, optimizations" },
    { name: "IELTS Speaking Practice", learnerMode: "self_learner", title: "IELTS Speaking", subject: "English", goal: "Practice fluency and coherence", plannedMinutes: 30, learningType: "practice", difficulty: "medium", priority: "high", notesPlaceholder: "New vocabulary, pronunciation issues" },
    { name: "AWS Certification Study", learnerMode: "job_holder", title: "AWS Certification", subject: "Cloud", goal: "Cover one service deeply", plannedMinutes: 45, learningType: "course", difficulty: "medium", priority: "high", notesPlaceholder: "Service limits, IAM points, architecture notes" },
    { name: "School Homework", learnerMode: "child", title: "Homework Session", subject: "School", goal: "Complete assigned homework", plannedMinutes: 40, learningType: "assignment", difficulty: "easy", priority: "high", notesPlaceholder: "Pending tasks and doubts" },
    { name: "Book Reading", learnerMode: "self_learner", title: "Book Reading", subject: "Reading", goal: "Read one chapter", plannedMinutes: 25, learningType: "reading", difficulty: "easy", priority: "medium", notesPlaceholder: "Insights and highlights" },
    { name: "Office Skill Learning", learnerMode: "job_holder", title: "Office Skills", subject: "Professional Skills", goal: "Improve one practical skill", plannedMinutes: 30, learningType: "video", difficulty: "medium", priority: "medium", notesPlaceholder: "Actionable takeaways for work" },
    { name: "Language Learning", learnerMode: "self_learner", title: "Language Learning", subject: "Language", goal: "Practice speaking/listening", plannedMinutes: 35, learningType: "practice", difficulty: "medium", priority: "medium", notesPlaceholder: "New words and sentence structures" },
    { name: "Exam Revision", learnerMode: "student", title: "Exam Revision", subject: "Exam", goal: "Revise key topics", plannedMinutes: 50, learningType: "revision", difficulty: "hard", priority: "high", notesPlaceholder: "Weak areas to revisit" },
];
function todayKey() {
    return new Date().toISOString().slice(0, 10);
}
function monthStartKey(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}
function weekStartDate(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return start;
}
function toDateKey(value) {
    return value.toISOString().slice(0, 10);
}
function toDate(dateKey) {
    return new Date(`${dateKey}T00:00:00.000Z`);
}
async function ensureDefaultTimerPresets() {
    await Promise.all(DEFAULT_TIMER_MINUTES.map((minutes) => TimerPreset_1.default.findOneAndUpdate({ userId: null, isDefault: true, minutes }, { userId: null, isDefault: true, minutes, label: `${minutes} min` }, { upsert: true, setDefaultsOnInsert: true })));
}
async function ensureDefaultTemplates() {
    await Promise.all(DEFAULT_TEMPLATES.map((template) => LearningTemplate_1.default.findOneAndUpdate({ userId: null, isDefault: true, name: template.name }, { ...template, userId: null, isDefault: true }, { upsert: true, setDefaultsOnInsert: true })));
}
async function pauseOtherActiveSessions(userId, exceptSessionId) {
    await LearningSession_1.default.updateMany({
        userId,
        status: "active",
        ...(exceptSessionId ? { _id: { $ne: exceptSessionId } } : {}),
    }, {
        $set: {
            status: "paused",
            pausedAt: new Date(),
        },
    });
}
async function markMissedSessions(userId) {
    await LearningSession_1.default.updateMany({
        userId,
        status: "planned",
        studyDate: { $lt: todayKey() },
    }, { $set: { status: "missed" } });
}
function computeMinutesFromTimes(startedAt, completedAt) {
    if (!startedAt || !completedAt)
        return 0;
    return Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 60000));
}
function computeStreak(dates) {
    const uniq = Array.from(new Set(dates)).sort();
    if (uniq.length === 0)
        return { currentStreak: 0, longestStreak: 0 };
    let longest = 1;
    let run = 1;
    for (let i = 1; i < uniq.length; i += 1) {
        const diff = Math.round((toDate(uniq[i]).getTime() - toDate(uniq[i - 1]).getTime()) / 86400000);
        if (diff === 1) {
            run += 1;
            longest = Math.max(longest, run);
        }
        else {
            run = 1;
        }
    }
    const today = toDate(todayKey());
    let current = 0;
    for (let cursor = new Date(today);; cursor.setDate(cursor.getDate() - 1)) {
        const key = toDateKey(cursor);
        if (!uniq.includes(key))
            break;
        current += 1;
    }
    return { currentStreak: current, longestStreak: longest };
}
async function createSession(userId, payload) {
    if (payload.status === "active") {
        await pauseOtherActiveSessions(userId);
    }
    const created = await LearningSession_1.default.create({
        ...payload,
        userId,
    });
    return created;
}
async function listSessions(userId, filters) {
    await markMissedSessions(userId);
    const query = { userId };
    if (filters.status)
        query.status = filters.status;
    if (filters.subject)
        query.subject = new RegExp(filters.subject, "i");
    if (filters.learnerMode)
        query.learnerMode = filters.learnerMode;
    if (filters.studyDate)
        query.studyDate = filters.studyDate;
    if (filters.fromDate || filters.toDate) {
        query.studyDate = {};
        if (filters.fromDate)
            query.studyDate.$gte = filters.fromDate;
        if (filters.toDate)
            query.studyDate.$lte = filters.toDate;
    }
    const skip = (filters.page - 1) * filters.limit;
    const [rows, total] = await Promise.all([
        LearningSession_1.default.find(query).sort({ studyDate: -1, createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
        LearningSession_1.default.countDocuments(query),
    ]);
    return {
        rows,
        pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            totalPages: total ? Math.ceil(total / filters.limit) : 0,
        },
    };
}
async function getSessionById(userId, id) {
    return LearningSession_1.default.findOne({ _id: id, userId }).lean();
}
async function updateSession(userId, id, patch) {
    if (patch.status === "active") {
        await pauseOtherActiveSessions(userId, id);
    }
    return LearningSession_1.default.findOneAndUpdate({ _id: id, userId }, patch, { new: true, runValidators: true }).lean();
}
async function deleteSession(userId, id) {
    return LearningSession_1.default.findOneAndDelete({ _id: id, userId }).lean();
}
async function startSession(userId, id) {
    await pauseOtherActiveSessions(userId, id);
    return LearningSession_1.default.findOneAndUpdate({ _id: id, userId }, { status: "active", startedAt: new Date(), pausedAt: null }, { new: true }).lean();
}
async function pauseSession(userId, id) {
    return LearningSession_1.default.findOneAndUpdate({ _id: id, userId }, { status: "paused", pausedAt: new Date() }, { new: true }).lean();
}
async function resumeSession(userId, id) {
    await pauseOtherActiveSessions(userId, id);
    return LearningSession_1.default.findOneAndUpdate({ _id: id, userId }, { status: "active", pausedAt: null }, { new: true }).lean();
}
async function completeSession(userId, id, actualMinutes) {
    const row = await LearningSession_1.default.findOne({ _id: id, userId });
    if (!row)
        return null;
    const completedAt = new Date();
    const finalMinutes = typeof actualMinutes === "number"
        ? actualMinutes
        : Math.max(row.actualMinutes ?? 0, computeMinutesFromTimes(row.startedAt, completedAt));
    row.status = "completed";
    row.completedAt = completedAt;
    row.actualMinutes = finalMinutes;
    await row.save();
    return row.toObject();
}
async function cancelSession(userId, id) {
    return LearningSession_1.default.findOneAndUpdate({ _id: id, userId }, { status: "cancelled" }, { new: true }).lean();
}
async function rescheduleSession(userId, id, studyDate) {
    return LearningSession_1.default.findOneAndUpdate({ _id: id, userId }, { studyDate, status: "planned" }, { new: true }).lean();
}
async function getTimerPresets(userId) {
    await ensureDefaultTimerPresets();
    return TimerPreset_1.default.find({
        $or: [{ isDefault: true, userId: null }, { userId }],
    })
        .sort({ minutes: 1 })
        .lean();
}
async function createTimerPreset(userId, label, minutes) {
    return TimerPreset_1.default.create({ userId, label, minutes, isDefault: false });
}
async function updateTimerPreset(userId, id, patch) {
    return TimerPreset_1.default.findOneAndUpdate({ _id: id, userId, isDefault: false }, patch, { new: true, runValidators: true }).lean();
}
async function deleteTimerPreset(userId, id) {
    return TimerPreset_1.default.findOneAndDelete({ _id: id, userId, isDefault: false }).lean();
}
async function getTemplates(userId) {
    await ensureDefaultTemplates();
    return LearningTemplate_1.default.find({
        $or: [{ isDefault: true, userId: null }, { userId }],
    }).lean();
}
async function createTemplate(userId, payload) {
    return LearningTemplate_1.default.create({ ...payload, userId, isDefault: false });
}
async function getGoals(userId) {
    const row = await LearningGoal_1.default.findOne({ userId }).lean();
    if (row)
        return row;
    return LearningGoal_1.default.create({ userId, dailyGoalMinutes: 120, weeklyGoalMinutes: 840 });
}
async function upsertGoals(userId, payload) {
    return LearningGoal_1.default.findOneAndUpdate({ userId }, { userId, ...payload }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
}
async function getStats(userId) {
    await markMissedSessions(userId);
    const today = todayKey();
    const weekStart = toDateKey(weekStartDate());
    const monthStart = monthStartKey();
    const [totalsAgg, completedRows] = await Promise.all([
        LearningSession_1.default.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: null,
                    todayMinutes: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $eq: ["$studyDate", today] }] }, "$actualMinutes", 0] },
                    },
                    weekMinutes: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $gte: ["$studyDate", weekStart] }] }, "$actualMinutes", 0] },
                    },
                    monthMinutes: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $gte: ["$studyDate", monthStart] }] }, "$actualMinutes", 0] },
                    },
                    totalMinutes: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$actualMinutes", 0] },
                    },
                    completedSessions: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    activeSessions: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
                    plannedSessions: { $sum: { $cond: [{ $eq: ["$status", "planned"] }, 1, 0] } },
                    missedSessions: { $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] } },
                    nonCancelledSessions: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, 1, 0] } },
                },
            },
        ]),
        LearningSession_1.default.find({ userId, status: "completed" }).select("studyDate actualMinutes subject learningType priority").lean(),
    ]);
    const totals = totalsAgg[0] ?? {};
    const subjectBreakdownMap = {};
    const dailyBreakdownMap = {};
    const learningTypeBreakdownMap = {};
    const priorityBreakdownMap = {};
    const streakDays = [];
    for (const row of completedRows) {
        const mins = row.actualMinutes ?? 0;
        subjectBreakdownMap[row.subject] = (subjectBreakdownMap[row.subject] ?? 0) + mins;
        dailyBreakdownMap[row.studyDate] = (dailyBreakdownMap[row.studyDate] ?? 0) + mins;
        learningTypeBreakdownMap[row.learningType] = (learningTypeBreakdownMap[row.learningType] ?? 0) + mins;
        priorityBreakdownMap[row.priority] = (priorityBreakdownMap[row.priority] ?? 0) + mins;
        streakDays.push(row.studyDate);
    }
    const { currentStreak, longestStreak } = computeStreak(streakDays);
    const completedSessions = totals.completedSessions ?? 0;
    const nonCancelledSessions = totals.nonCancelledSessions ?? 0;
    return {
        todayMinutes: totals.todayMinutes ?? 0,
        weekMinutes: totals.weekMinutes ?? 0,
        monthMinutes: totals.monthMinutes ?? 0,
        totalMinutes: totals.totalMinutes ?? 0,
        completedSessions,
        activeSessions: totals.activeSessions ?? 0,
        plannedSessions: totals.plannedSessions ?? 0,
        missedSessions: totals.missedSessions ?? 0,
        completionRate: nonCancelledSessions > 0 ? Math.round((completedSessions / nonCancelledSessions) * 100) : 0,
        currentStreak,
        longestStreak,
        averageSessionMinutes: completedSessions > 0 ? Math.round((totals.totalMinutes ?? 0) / completedSessions) : 0,
        subjectBreakdown: Object.entries(subjectBreakdownMap).map(([subject, minutes]) => ({ subject, minutes })),
        dailyBreakdown: Object.entries(dailyBreakdownMap).map(([date, minutes]) => ({ date, minutes })).sort((a, b) => a.date.localeCompare(b.date)),
        learningTypeBreakdown: Object.entries(learningTypeBreakdownMap).map(([learningType, minutes]) => ({ learningType, minutes })),
        priorityBreakdown: Object.entries(priorityBreakdownMap).map(([priority, minutes]) => ({ priority, minutes })),
    };
}
async function getChildControls(userId) {
    return ChildLearningControl_1.default.findOne({ userId }).lean();
}
async function upsertChildControls(userId, payload) {
    const updatePayload = {
        userId,
        dailyLimitMinutes: payload.dailyLimitMinutes,
        rewardPointsEnabled: payload.rewardPointsEnabled,
        allowedSubjects: payload.allowedSubjects ?? [],
    };
    if (payload.parentPin) {
        updatePayload.parentPinHash = await bcryptjs_1.default.hash(payload.parentPin, 10);
    }
    return ChildLearningControl_1.default.findOneAndUpdate({ userId }, updatePayload, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
    }).lean();
}
async function listSessionNotes(userId, sessionId) {
    return LearningNote_1.default.find({ userId, sessionId }).sort({ createdAt: -1 }).lean();
}
async function createSessionNote(userId, sessionId, payload) {
    const session = await LearningSession_1.default.findOne({ _id: sessionId, userId }).lean();
    if (!session)
        return null;
    return LearningNote_1.default.create({ userId, sessionId, ...payload });
}
async function updateNote(userId, noteId, patch) {
    return LearningNote_1.default.findOneAndUpdate({ _id: noteId, userId }, patch, { new: true }).lean();
}
async function deleteNote(userId, noteId) {
    return LearningNote_1.default.findOneAndDelete({ _id: noteId, userId }).lean();
}
