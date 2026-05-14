import bcrypt from "bcryptjs";
import LearningSession, {
  LEARNING_SESSION_STATUSES,
  LearningSessionStatus,
} from "../models/LearningSession";
import TimerPreset from "../models/TimerPreset";
import LearningTemplate from "../models/LearningTemplate";
import LearningGoal from "../models/LearningGoal";
import ChildLearningControl from "../models/ChildLearningControl";
import LearningNote from "../models/LearningNote";

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

type SessionFilters = {
  status?: string;
  subject?: string;
  learnerMode?: string;
  studyDate?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
};

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

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

async function ensureDefaultTimerPresets() {
  await Promise.all(
    DEFAULT_TIMER_MINUTES.map((minutes) =>
      TimerPreset.findOneAndUpdate(
        { userId: null, isDefault: true, minutes },
        { userId: null, isDefault: true, minutes, label: `${minutes} min` },
        { upsert: true, setDefaultsOnInsert: true },
      ),
    ),
  );
}

async function ensureDefaultTemplates() {
  await Promise.all(
    DEFAULT_TEMPLATES.map((template) =>
      LearningTemplate.findOneAndUpdate(
        { userId: null, isDefault: true, name: template.name },
        { ...template, userId: null, isDefault: true },
        { upsert: true, setDefaultsOnInsert: true },
      ),
    ),
  );
}

async function pauseOtherActiveSessions(userId: string, exceptSessionId?: string) {
  await LearningSession.updateMany(
    {
      userId,
      status: "active",
      ...(exceptSessionId ? { _id: { $ne: exceptSessionId } } : {}),
    },
    {
      $set: {
        status: "paused",
        pausedAt: new Date(),
      },
    },
  );
}

async function markMissedSessions(userId: string) {
  await LearningSession.updateMany(
    {
      userId,
      status: "planned",
      studyDate: { $lt: todayKey() },
    },
    { $set: { status: "missed" } },
  );
}

function computeMinutesFromTimes(startedAt?: Date | null, completedAt?: Date | null) {
  if (!startedAt || !completedAt) return 0;
  return Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 60000));
}

function computeStreak(dates: string[]) {
  const uniq = Array.from(new Set(dates)).sort();
  if (uniq.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniq.length; i += 1) {
    const diff = Math.round((toDate(uniq[i]).getTime() - toDate(uniq[i - 1]).getTime()) / 86400000);
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const today = toDate(todayKey());
  let current = 0;
  for (let cursor = new Date(today); ; cursor.setDate(cursor.getDate() - 1)) {
    const key = toDateKey(cursor);
    if (!uniq.includes(key)) break;
    current += 1;
  }

  return { currentStreak: current, longestStreak: longest };
}

export async function createSession(userId: string, payload: any) {
  if (payload.status === "active") {
    await pauseOtherActiveSessions(userId);
  }
  const created = await LearningSession.create({
    ...payload,
    userId,
  });
  return created;
}

export async function listSessions(userId: string, filters: SessionFilters) {
  await markMissedSessions(userId);
  const query: any = { userId };
  if (filters.status) query.status = filters.status;
  if (filters.subject) query.subject = new RegExp(filters.subject, "i");
  if (filters.learnerMode) query.learnerMode = filters.learnerMode;
  if (filters.studyDate) query.studyDate = filters.studyDate;
  if (filters.fromDate || filters.toDate) {
    query.studyDate = {};
    if (filters.fromDate) query.studyDate.$gte = filters.fromDate;
    if (filters.toDate) query.studyDate.$lte = filters.toDate;
  }

  const skip = (filters.page - 1) * filters.limit;
  const [rows, total] = await Promise.all([
    LearningSession.find(query).sort({ studyDate: -1, createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
    LearningSession.countDocuments(query),
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

export async function getSessionById(userId: string, id: string) {
  return LearningSession.findOne({ _id: id, userId }).lean();
}

export async function updateSession(userId: string, id: string, patch: any) {
  if (patch.status === "active") {
    await pauseOtherActiveSessions(userId, id);
  }
  return LearningSession.findOneAndUpdate({ _id: id, userId }, patch, { new: true, runValidators: true }).lean();
}

export async function deleteSession(userId: string, id: string) {
  return LearningSession.findOneAndDelete({ _id: id, userId }).lean();
}

export async function startSession(userId: string, id: string) {
  await pauseOtherActiveSessions(userId, id);
  return LearningSession.findOneAndUpdate(
    { _id: id, userId },
    { status: "active", startedAt: new Date(), pausedAt: null },
    { new: true },
  ).lean();
}

export async function pauseSession(userId: string, id: string) {
  return LearningSession.findOneAndUpdate(
    { _id: id, userId },
    { status: "paused", pausedAt: new Date() },
    { new: true },
  ).lean();
}

export async function resumeSession(userId: string, id: string) {
  await pauseOtherActiveSessions(userId, id);
  return LearningSession.findOneAndUpdate(
    { _id: id, userId },
    { status: "active", pausedAt: null },
    { new: true },
  ).lean();
}

export async function completeSession(userId: string, id: string, actualMinutes?: number) {
  const row = await LearningSession.findOne({ _id: id, userId });
  if (!row) return null;
  const completedAt = new Date();
  const finalMinutes =
    typeof actualMinutes === "number"
      ? actualMinutes
      : Math.max(row.actualMinutes ?? 0, computeMinutesFromTimes(row.startedAt, completedAt));

  row.status = "completed";
  row.completedAt = completedAt;
  row.actualMinutes = finalMinutes;
  await row.save();
  return row.toObject();
}

export async function cancelSession(userId: string, id: string) {
  return LearningSession.findOneAndUpdate(
    { _id: id, userId },
    { status: "cancelled" },
    { new: true },
  ).lean();
}

export async function rescheduleSession(userId: string, id: string, studyDate: string) {
  return LearningSession.findOneAndUpdate(
    { _id: id, userId },
    { studyDate, status: "planned" },
    { new: true },
  ).lean();
}

export async function getTimerPresets(userId: string) {
  await ensureDefaultTimerPresets();
  return TimerPreset.find({
    $or: [{ isDefault: true, userId: null }, { userId }],
  })
    .sort({ minutes: 1 })
    .lean();
}

export async function createTimerPreset(userId: string, label: string, minutes: number) {
  return TimerPreset.create({ userId, label, minutes, isDefault: false });
}

export async function updateTimerPreset(userId: string, id: string, patch: any) {
  return TimerPreset.findOneAndUpdate(
    { _id: id, userId, isDefault: false },
    patch,
    { new: true, runValidators: true },
  ).lean();
}

export async function deleteTimerPreset(userId: string, id: string) {
  return TimerPreset.findOneAndDelete({ _id: id, userId, isDefault: false }).lean();
}

export async function getTemplates(userId: string) {
  await ensureDefaultTemplates();
  return LearningTemplate.find({
    $or: [{ isDefault: true, userId: null }, { userId }],
  }).lean();
}

export async function createTemplate(userId: string, payload: any) {
  return LearningTemplate.create({ ...payload, userId, isDefault: false });
}

export async function getGoals(userId: string) {
  const row = await LearningGoal.findOne({ userId }).lean();
  if (row) return row;
  return LearningGoal.create({ userId, dailyGoalMinutes: 120, weeklyGoalMinutes: 840 });
}

export async function upsertGoals(userId: string, payload: any) {
  return LearningGoal.findOneAndUpdate(
    { userId },
    { userId, ...payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
}

export async function getStats(userId: string) {
  await markMissedSessions(userId);
  const today = todayKey();
  const weekStart = toDateKey(weekStartDate());
  const monthStart = monthStartKey();

  const [totalsAgg, completedRows] = await Promise.all([
    LearningSession.aggregate([
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
    LearningSession.find({ userId, status: "completed" }).select("studyDate actualMinutes subject learningType priority").lean(),
  ]);

  const totals = totalsAgg[0] ?? {};
  const subjectBreakdownMap: Record<string, number> = {};
  const dailyBreakdownMap: Record<string, number> = {};
  const learningTypeBreakdownMap: Record<string, number> = {};
  const priorityBreakdownMap: Record<string, number> = {};
  const streakDays: string[] = [];

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

export async function getChildControls(userId: string) {
  return ChildLearningControl.findOne({ userId }).lean();
}

export async function upsertChildControls(userId: string, payload: any) {
  const updatePayload: any = {
    userId,
    dailyLimitMinutes: payload.dailyLimitMinutes,
    rewardPointsEnabled: payload.rewardPointsEnabled,
    allowedSubjects: payload.allowedSubjects ?? [],
  };
  if (payload.parentPin) {
    updatePayload.parentPinHash = await bcrypt.hash(payload.parentPin, 10);
  }
  return ChildLearningControl.findOneAndUpdate({ userId }, updatePayload, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).lean();
}

export async function listSessionNotes(userId: string, sessionId: string) {
  return LearningNote.find({ userId, sessionId }).sort({ createdAt: -1 }).lean();
}

export async function createSessionNote(userId: string, sessionId: string, payload: any) {
  const session = await LearningSession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return null;
  return LearningNote.create({ userId, sessionId, ...payload });
}

export async function updateNote(userId: string, noteId: string, patch: any) {
  return LearningNote.findOneAndUpdate({ _id: noteId, userId }, patch, { new: true }).lean();
}

export async function deleteNote(userId: string, noteId: string) {
  return LearningNote.findOneAndDelete({ _id: noteId, userId }).lean();
}

export { LEARNING_SESSION_STATUSES };
