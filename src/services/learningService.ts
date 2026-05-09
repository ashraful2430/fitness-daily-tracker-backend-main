import { HydratedDocument } from "mongoose";
import LearningSession, {
  ILearningSession,
  LearningSessionStatus,
} from "../models/LearningSession";
import {
  CreateLearningSessionInput,
  LearningSessionListFilters,
  UpdateLearningSessionInput,
} from "../validation/learningValidation";

type ServiceError = {
  error: string;
  status: number;
};

type SessionWriteSuccess<T> = {
  data: T;
};

type LearningSessionDocument = HydratedDocument<ILearningSession>;

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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSessionQuery(userId: string, filters?: Partial<LearningSessionListFilters>) {
  const query: {
    userId: string;
    status?: LearningSessionStatus;
    subject?: { $regex: string; $options: string };
    date?: { $gte?: string; $lte?: string };
  } = { userId };

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

async function ensureNoOtherActiveSession(
  userId: string,
  sessionId?: string,
) {
  const existingActiveSession = await LearningSession.findOne({
    userId,
    status: "active",
    ...(sessionId ? { _id: { $ne: sessionId } } : {}),
  });

  return existingActiveSession;
}

export async function createLearningSession(
  userId: string,
  input: CreateLearningSessionInput,
): Promise<SessionWriteSuccess<LearningSessionDocument> | ServiceError> {
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

  const createdSession = await LearningSession.create({
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

export async function updateLearningSession(
  userId: string,
  sessionId: string,
  updates: UpdateLearningSessionInput,
): Promise<SessionWriteSuccess<LearningSessionDocument> | ServiceError> {
  if (updates.status === "active") {
    const existingActiveSession = await ensureNoOtherActiveSession(userId, sessionId);
    if (existingActiveSession) {
      return {
        error: "Another learning session is already active.",
        status: 409,
      };
    }
  }

  const updatedSession = await LearningSession.findOneAndUpdate(
    { _id: sessionId, userId },
    updates,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedSession) {
    return {
      error: "Learning session not found.",
      status: 404,
    };
  }

  return { data: updatedSession };
}

export async function deleteLearningSession(
  userId: string,
  sessionId: string,
): Promise<SessionWriteSuccess<{ deleted: true }> | ServiceError> {
  const deletedSession = await LearningSession.findOneAndDelete({
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

export async function listLearningSessions(
  userId: string,
  filters: LearningSessionListFilters,
) {
  const query = buildSessionQuery(userId, filters);
  const skip = (filters.page - 1) * filters.limit;

  const [sessions, total] = await Promise.all([
    LearningSession.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(filters.limit)
      .lean(),
    LearningSession.countDocuments(query),
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

function computeCurrentStreak(sessions: Array<Pick<ILearningSession, "date" | "status" | "actualMinutes">>) {
  const qualifyingDates = new Set(
    sessions
      .filter((session) => session.status === "completed" || session.actualMinutes > 0)
      .map((session) => session.date),
  );

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

export async function getLearningSummary(userId: string) {
  const today = getTodayDateString();
  const weekStart = getStartOfWeekDateString();

  const [todayAgg, weekAgg, totalAgg, totalSessions, completedSessions, activeSession, topSubjects, recentSessions, streakSessions] =
    await Promise.all([
      LearningSession.aggregate([
        { $match: { userId, date: today } },
        { $group: { _id: null, totalMinutes: { $sum: "$actualMinutes" } } },
      ]),
      LearningSession.aggregate([
        { $match: { userId, date: { $gte: weekStart, $lte: today } } },
        { $group: { _id: null, totalMinutes: { $sum: "$actualMinutes" } } },
      ]),
      LearningSession.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalMinutes: { $sum: "$actualMinutes" } } },
      ]),
      LearningSession.countDocuments({ userId }),
      LearningSession.countDocuments({ userId, status: "completed" }),
      LearningSession.findOne({ userId, status: "active" })
        .sort({ updatedAt: -1 })
        .lean(),
      LearningSession.aggregate([
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
      LearningSession.find({ userId })
        .sort({ updatedAt: -1, date: -1 })
        .limit(5)
        .lean(),
      LearningSession.find({ userId })
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
      completionRate:
        totalSessions === 0
          ? 0
          : Math.round((completedSessions / totalSessions) * 100),
      currentStreak: computeCurrentStreak(streakSessions),
      activeSession: activeSession ?? null,
      topSubjects,
      recentSessions,
    },
  };
}
