"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WORKOUT_TEMPLATES = void 0;
exports.listWorkouts = listWorkouts;
exports.createWorkout = createWorkout;
exports.getWorkout = getWorkout;
exports.updateWorkout = updateWorkout;
exports.deleteWorkout = deleteWorkout;
exports.setWorkoutStatus = setWorkoutStatus;
exports.getFitnessGoal = getFitnessGoal;
exports.upsertFitnessGoal = upsertFitnessGoal;
exports.ensureDefaultWorkoutTemplates = ensureDefaultWorkoutTemplates;
exports.listWorkoutTemplates = listWorkoutTemplates;
exports.createWorkoutTemplate = createWorkoutTemplate;
exports.updateWorkoutTemplate = updateWorkoutTemplate;
exports.deleteWorkoutTemplate = deleteWorkoutTemplate;
exports.generateRecoveryRecommendation = generateRecoveryRecommendation;
exports.listRecoveryChecks = listRecoveryChecks;
exports.createRecoveryCheck = createRecoveryCheck;
exports.updateRecoveryCheck = updateRecoveryCheck;
exports.deleteRecoveryCheck = deleteRecoveryCheck;
exports.getFitnessStats = getFitnessStats;
exports.getPersonalRecords = getPersonalRecords;
exports.recalculatePersonalRecords = recalculatePersonalRecords;
const mongoose_1 = __importDefault(require("mongoose"));
const fitness_1 = require("../constants/fitness");
const FitnessGoal_1 = __importDefault(require("../models/FitnessGoal"));
const PersonalRecord_1 = __importDefault(require("../models/PersonalRecord"));
const RecoveryCheck_1 = __importDefault(require("../models/RecoveryCheck"));
const Workout_1 = __importDefault(require("../models/Workout"));
const WorkoutTemplate_1 = __importDefault(require("../models/WorkoutTemplate"));
exports.DEFAULT_WORKOUT_TEMPLATES = [
    { name: "Morning Walk", goalType: "daily_movement", title: "Morning Walk", workoutType: "walking", durationMinutes: 30, caloriesEstimate: 120, intensity: "easy", bodyPart: "cardio", notesPlaceholder: "Route, pace, and how you felt." },
    { name: "Full Body Workout", goalType: "general_fitness", title: "Full Body Workout", workoutType: "strength", durationMinutes: 45, caloriesEstimate: 280, intensity: "medium", bodyPart: "full_body", notesPlaceholder: "Main lifts, reps, and energy." },
    { name: "Push Day", goalType: "muscle_gain", title: "Push Day", workoutType: "strength", durationMinutes: 50, caloriesEstimate: 320, intensity: "hard", bodyPart: "chest", notesPlaceholder: "Chest, shoulders, triceps." },
    { name: "Pull Day", goalType: "muscle_gain", title: "Pull Day", workoutType: "strength", durationMinutes: 50, caloriesEstimate: 320, intensity: "hard", bodyPart: "back", notesPlaceholder: "Back, biceps, grip work." },
    { name: "Leg Day", goalType: "strength_training", title: "Leg Day", workoutType: "strength", durationMinutes: 55, caloriesEstimate: 380, intensity: "hard", bodyPart: "legs", notesPlaceholder: "Squats, hinges, lunges." },
    { name: "Fat Loss Cardio", goalType: "weight_loss", title: "Fat Loss Cardio", workoutType: "cardio", durationMinutes: 35, caloriesEstimate: 350, intensity: "hard", bodyPart: "cardio", notesPlaceholder: "Machine, intervals, average heart rate." },
    { name: "Beginner Home Workout", goalType: "general_fitness", title: "Beginner Home Workout", workoutType: "general", durationMinutes: 25, caloriesEstimate: 160, intensity: "easy", bodyPart: "full_body", notesPlaceholder: "Bodyweight circuit notes." },
    { name: "Office Stretch", goalType: "flexibility", title: "Office Stretch", workoutType: "stretching", durationMinutes: 10, caloriesEstimate: 30, intensity: "easy", bodyPart: "mobility", notesPlaceholder: "Tight areas and relief." },
    { name: "Yoga Session", goalType: "flexibility", title: "Yoga Session", workoutType: "yoga", durationMinutes: 40, caloriesEstimate: 140, intensity: "medium", bodyPart: "mobility", notesPlaceholder: "Flow, poses, breathing." },
    { name: "Running Session", goalType: "cardio_health", title: "Running Session", workoutType: "running", durationMinutes: 30, caloriesEstimate: 300, intensity: "medium", bodyPart: "cardio", notesPlaceholder: "Distance, pace, route." },
];
function asObjectId(userId) {
    return new mongoose_1.default.Types.ObjectId(userId);
}
function parsePage(value) {
    return Number.isInteger(value) && value && value > 0 ? value : 1;
}
function parseLimit(value) {
    return Number.isInteger(value) && value && value > 0 ? Math.min(value, 100) : 20;
}
function dateRange(date, fromDate, toDate) {
    if (date) {
        const start = startOfDay(new Date(date));
        return { $gte: start, $lt: addDays(start, 1) };
    }
    const range = {};
    if (fromDate)
        range.$gte = startOfDay(new Date(fromDate));
    if (toDate)
        range.$lte = endOfDay(new Date(toDate));
    return Object.keys(range).length ? range : undefined;
}
function serializeId(row) {
    const plain = typeof row.toObject === "function" ? row.toObject() : row;
    return { ...plain, id: String(plain._id), _id: plain._id };
}
async function listWorkouts(userId, filters) {
    const page = parsePage(filters.page);
    const limit = parseLimit(filters.limit);
    const query = { userId: asObjectId(userId) };
    for (const field of ["status", "workoutType", "goalType", "intensity", "bodyPart"]) {
        const value = filters[field];
        if (typeof value === "string" && value.trim())
            query[field] = value.trim();
    }
    const range = dateRange(filters.workoutDate, filters.fromDate, filters.toDate);
    if (range)
        query.workoutDate = range;
    if (filters.search?.trim()) {
        query.$or = [
            { title: { $regex: filters.search.trim(), $options: "i" } },
            { notes: { $regex: filters.search.trim(), $options: "i" } },
        ];
    }
    const [rows, total] = await Promise.all([
        Workout_1.default.find(query).sort({ workoutDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Workout_1.default.countDocuments(query),
    ]);
    return {
        data: rows.map(serializeId),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
}
async function createWorkout(userId, payload) {
    const workout = await Workout_1.default.create(normalizeWorkoutPayload(userId, payload));
    if (workout.status === "completed")
        await recalculatePersonalRecords(userId);
    return serializeId(workout);
}
async function getWorkout(userId, id) {
    const workout = await Workout_1.default.findOne({ _id: id, userId: asObjectId(userId) }).lean();
    return workout ? serializeId(workout) : null;
}
async function updateWorkout(userId, id, payload) {
    const update = normalizeWorkoutPatch(payload);
    const workout = await Workout_1.default.findOneAndUpdate({ _id: id, userId: asObjectId(userId) }, update, { new: true, runValidators: true });
    if (workout?.status === "completed")
        await recalculatePersonalRecords(userId);
    return workout ? serializeId(workout) : null;
}
async function deleteWorkout(userId, id) {
    const workout = await Workout_1.default.findOneAndDelete({ _id: id, userId: asObjectId(userId) });
    if (workout?.status === "completed")
        await recalculatePersonalRecords(userId);
    return workout ? serializeId(workout) : null;
}
async function setWorkoutStatus(userId, id, status) {
    const update = { status };
    if (status === "active") {
        await Workout_1.default.updateMany({ userId: asObjectId(userId), status: "active", _id: { $ne: id } }, { $set: { status: "planned" } });
        update.startedAt = new Date();
    }
    if (status === "completed")
        update.completedAt = new Date();
    const workout = await Workout_1.default.findOneAndUpdate({ _id: id, userId: asObjectId(userId) }, { $set: update }, { new: true });
    if (workout?.status === "completed")
        await recalculatePersonalRecords(userId);
    return workout ? serializeId(workout) : null;
}
async function getFitnessGoal(userId) {
    const goal = await FitnessGoal_1.default.findOneAndUpdate({ userId: asObjectId(userId) }, { $setOnInsert: { userId: asObjectId(userId) } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    return serializeId(goal);
}
async function upsertFitnessGoal(userId, payload) {
    const goal = await FitnessGoal_1.default.findOneAndUpdate({ userId: asObjectId(userId) }, { $set: { ...payload, userId: asObjectId(userId) } }, { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }).lean();
    return serializeId(goal);
}
async function ensureDefaultWorkoutTemplates() {
    await Promise.all(exports.DEFAULT_WORKOUT_TEMPLATES.map((template) => WorkoutTemplate_1.default.findOneAndUpdate({ name: template.name, isDefault: true }, { $set: { ...template, isDefault: true, userId: null } }, { upsert: true, setDefaultsOnInsert: true })));
}
async function listWorkoutTemplates(userId) {
    await ensureDefaultWorkoutTemplates();
    const rows = await WorkoutTemplate_1.default.find({
        $or: [{ isDefault: true }, { userId: asObjectId(userId) }],
    }).sort({ isDefault: -1, name: 1 }).lean();
    return rows.map(serializeId);
}
async function createWorkoutTemplate(userId, payload) {
    const template = await WorkoutTemplate_1.default.create({
        ...normalizeTemplatePayload(payload),
        userId: asObjectId(userId),
        isDefault: false,
    });
    return serializeId(template);
}
async function updateWorkoutTemplate(userId, id, payload) {
    const template = await WorkoutTemplate_1.default.findOneAndUpdate({ _id: id, userId: asObjectId(userId), isDefault: false }, normalizeTemplatePayload(payload), { new: true, runValidators: true });
    return template ? serializeId(template) : null;
}
async function deleteWorkoutTemplate(userId, id) {
    const template = await WorkoutTemplate_1.default.findOneAndDelete({
        _id: id,
        userId: asObjectId(userId),
        isDefault: false,
    });
    return template ? serializeId(template) : null;
}
function generateRecoveryRecommendation(payload) {
    if (payload.isRestDay) {
        return "Make today restorative: light stretching, hydration, nourishing food, and solid sleep.";
    }
    if (payload.sorenessLevel === "high") {
        return "Take a rest day or keep it to light mobility so your body can recover.";
    }
    if (payload.energyLevel === "low" && payload.sleepQuality === "poor") {
        return "Choose rest or an easy walk today, then prioritize sleep tonight.";
    }
    if (payload.sleepQuality === "excellent" && payload.energyLevel === "high") {
        return "You are ready for normal or hard training if your schedule allows.";
    }
    return "Keep training moderate, hydrate well, and adjust intensity based on how you feel.";
}
async function listRecoveryChecks(userId, filters) {
    const page = parsePage(filters.page);
    const limit = parseLimit(filters.limit);
    const query = { userId: asObjectId(userId) };
    const range = dateRange(filters.checkDate, filters.fromDate, filters.toDate);
    if (range)
        query.checkDate = range;
    const [rows, total] = await Promise.all([
        RecoveryCheck_1.default.find(query).sort({ checkDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        RecoveryCheck_1.default.countDocuments(query),
    ]);
    return { data: rows.map(serializeId), meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}
async function createRecoveryCheck(userId, payload) {
    const body = normalizeRecoveryPayload(userId, payload);
    const row = await RecoveryCheck_1.default.findOneAndUpdate({ userId: asObjectId(userId), checkDate: body.checkDate }, { $set: body }, { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }).lean();
    return serializeId(row);
}
async function updateRecoveryCheck(userId, id, payload) {
    const existing = await RecoveryCheck_1.default.findOne({ _id: id, userId: asObjectId(userId) });
    if (!existing)
        return null;
    const next = {
        sleepQuality: payload.sleepQuality ?? existing.sleepQuality,
        energyLevel: payload.energyLevel ?? existing.energyLevel,
        sorenessLevel: payload.sorenessLevel ?? existing.sorenessLevel,
        isRestDay: payload.isRestDay ?? existing.isRestDay,
    };
    Object.assign(existing, payload, {
        checkDate: payload.checkDate ? startOfDay(new Date(payload.checkDate)) : existing.checkDate,
        recommendation: generateRecoveryRecommendation(next),
    });
    await existing.save();
    return serializeId(existing);
}
async function deleteRecoveryCheck(userId, id) {
    const row = await RecoveryCheck_1.default.findOneAndDelete({ _id: id, userId: asObjectId(userId) });
    return row ? serializeId(row) : null;
}
async function getFitnessStats(userId) {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completed = await Workout_1.default.find({ userId: asObjectId(userId), status: "completed" })
        .select("workoutDate durationMinutes calories steps workoutType bodyPart intensity")
        .lean();
    const goal = await getFitnessGoal(userId);
    const inRange = (date, start) => new Date(date) >= start;
    const todayRows = completed.filter((row) => sameDay(new Date(row.workoutDate), today));
    const weekRows = completed.filter((row) => inRange(new Date(row.workoutDate), weekStart));
    const monthRows = completed.filter((row) => inRange(new Date(row.workoutDate), monthStart));
    const currentStreak = calculateCurrentStreak(completed.map((row) => new Date(row.workoutDate)));
    const longestStreak = calculateLongestStreak(completed.map((row) => new Date(row.workoutDate)));
    const totalDuration = completed.reduce((sum, row) => sum + (row.durationMinutes ?? 0), 0);
    const weekWorkouts = weekRows.length;
    const weekCalories = sumField(weekRows, "calories");
    const weekMinutes = sumField(weekRows, "durationMinutes");
    const weekSteps = sumField(weekRows, "steps");
    return {
        completedWorkoutsToday: todayRows.length,
        completedWorkoutsThisWeek: weekRows.length,
        completedWorkoutsThisMonth: monthRows.length,
        caloriesToday: sumField(todayRows, "calories"),
        caloriesThisWeek: weekCalories,
        caloriesThisMonth: sumField(monthRows, "calories"),
        activeMinutesToday: sumField(todayRows, "durationMinutes"),
        activeMinutesThisWeek: weekMinutes,
        activeMinutesThisMonth: sumField(monthRows, "durationMinutes"),
        currentStreak,
        longestStreak,
        averageWorkoutDuration: completed.length ? Math.round(totalDuration / completed.length) : 0,
        mostTrainedType: mostCommon(completed, "workoutType"),
        mostTrainedBodyPart: mostCommon(completed, "bodyPart"),
        bestWorkoutDay: bestWorkoutDay(completed),
        weeklyGoalProgress: percentage(weekWorkouts, goal.weeklyWorkoutTarget),
        caloriesGoalProgress: percentage(weekCalories, goal.weeklyCaloriesTarget),
        activeMinutesGoalProgress: percentage(weekMinutes, goal.weeklyActiveMinutesTarget),
        stepsGoalProgress: percentage(weekSteps / 7, goal.dailyStepsTarget),
        workoutTypeBreakdown: breakdown(completed, "workoutType"),
        bodyPartBreakdown: breakdown(completed, "bodyPart"),
        intensityBreakdown: breakdown(completed, "intensity"),
        dailyWorkoutBreakdown: dailyBreakdown(completed),
    };
}
async function getPersonalRecords(userId) {
    const rows = await PersonalRecord_1.default.find({ userId: asObjectId(userId) }).sort({ recordType: 1 }).lean();
    return rows.map(serializeId);
}
async function recalculatePersonalRecords(userId) {
    const completed = await Workout_1.default.find({ userId: asObjectId(userId), status: "completed" }).lean();
    const records = fitness_1.PERSONAL_RECORD_TYPES.map((type) => calculateRecord(type, completed)).filter(Boolean);
    await PersonalRecord_1.default.deleteMany({ userId: asObjectId(userId) });
    if (records.length) {
        await PersonalRecord_1.default.insertMany(records.map((record) => ({ ...record, userId: asObjectId(userId) })));
    }
    return getPersonalRecords(userId);
}
function normalizeWorkoutPayload(userId, payload) {
    return {
        userId: asObjectId(userId),
        title: String(payload.title).trim(),
        workoutDate: payload.workoutDate ? new Date(payload.workoutDate) : new Date(),
        workoutType: String(payload.workoutType ?? "general"),
        goalType: String(payload.goalType ?? "general_fitness"),
        durationMinutes: Number(payload.durationMinutes),
        calories: Number(payload.calories ?? 0),
        intensity: String(payload.intensity ?? "medium"),
        bodyPart: String(payload.bodyPart ?? "full_body"),
        sets: Number(payload.sets ?? 0),
        reps: Number(payload.reps ?? 0),
        weight: Number(payload.weight ?? 0),
        distance: Number(payload.distance ?? 0),
        steps: Number(payload.steps ?? 0),
        moodAfter: payload.moodAfter ? String(payload.moodAfter) : null,
        notes: typeof payload.notes === "string" ? payload.notes.trim() : "",
        status: String(payload.status ?? "planned"),
        startedAt: payload.startedAt ? new Date(payload.startedAt) : null,
        completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
    };
}
function normalizeWorkoutPatch(payload) {
    const patch = { ...payload };
    if (typeof patch.title === "string")
        patch.title = patch.title.trim();
    if (patch.workoutDate)
        patch.workoutDate = new Date(patch.workoutDate);
    if (typeof patch.notes === "string")
        patch.notes = patch.notes.trim();
    if (patch.durationMinutes !== undefined)
        patch.duration = patch.durationMinutes;
    if (patch.workoutType !== undefined)
        patch.type = patch.workoutType;
    return patch;
}
function normalizeTemplatePayload(payload) {
    return {
        name: typeof payload.name === "string" ? payload.name.trim() : String(payload.title ?? "").trim(),
        title: typeof payload.title === "string" ? payload.title.trim() : String(payload.name ?? "").trim(),
        goalType: String(payload.goalType ?? "general_fitness"),
        workoutType: String(payload.workoutType ?? "general"),
        durationMinutes: Number(payload.durationMinutes),
        caloriesEstimate: Number(payload.caloriesEstimate ?? payload.calories ?? 0),
        intensity: String(payload.intensity ?? "medium"),
        bodyPart: String(payload.bodyPart ?? "full_body"),
        notesPlaceholder: typeof payload.notesPlaceholder === "string" ? payload.notesPlaceholder.trim() : "",
    };
}
function normalizeRecoveryPayload(userId, payload) {
    const recommendation = generateRecoveryRecommendation({
        sleepQuality: payload.sleepQuality,
        energyLevel: payload.energyLevel,
        sorenessLevel: payload.sorenessLevel,
        isRestDay: Boolean(payload.isRestDay),
    });
    return {
        userId: asObjectId(userId),
        checkDate: startOfDay(new Date(payload.checkDate)),
        sleepQuality: payload.sleepQuality,
        energyLevel: payload.energyLevel,
        sorenessLevel: payload.sorenessLevel,
        isRestDay: Boolean(payload.isRestDay),
        waterGlasses: payload.waterGlasses ?? 0,
        recommendation,
    };
}
function sumField(rows, field) {
    return rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
}
function percentage(value, target) {
    return target > 0 ? Math.min(Math.round((value / target) * 100), 100) : 0;
}
function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}
function endOfDay(date) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
}
function addDays(date, days) {
    const value = new Date(date);
    value.setDate(value.getDate() + days);
    return value;
}
function startOfWeek(date) {
    const value = startOfDay(date);
    value.setDate(value.getDate() - value.getDay());
    return value;
}
function dateKey(date) {
    return startOfDay(date).toISOString().slice(0, 10);
}
function sameDay(a, b) {
    return dateKey(a) === dateKey(b);
}
function breakdown(rows, field) {
    const map = new Map();
    rows.forEach((row) => map.set(row[field], (map.get(row[field]) ?? 0) + 1));
    return Array.from(map.entries()).map(([key, count]) => ({ key, count }));
}
function mostCommon(rows, field) {
    return breakdown(rows, field).sort((a, b) => b.count - a.count)[0]?.key ?? null;
}
function bestWorkoutDay(rows) {
    const map = new Map();
    rows.forEach((row) => map.set(dateKey(new Date(row.workoutDate)), (map.get(dateKey(new Date(row.workoutDate))) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
function dailyBreakdown(rows) {
    const map = new Map();
    rows.forEach((row) => map.set(dateKey(new Date(row.workoutDate)), (map.get(dateKey(new Date(row.workoutDate))) ?? 0) + 1));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
}
function calculateCurrentStreak(dates) {
    const keys = new Set(dates.map(dateKey));
    let streak = 0;
    for (let cursor = startOfDay(new Date()); keys.has(dateKey(cursor)); cursor = addDays(cursor, -1)) {
        streak += 1;
    }
    return streak;
}
function calculateLongestStreak(dates) {
    const sorted = Array.from(new Set(dates.map(dateKey))).sort();
    let best = 0;
    let current = 0;
    let previous = null;
    for (const key of sorted) {
        const date = new Date(`${key}T00:00:00.000Z`);
        current = previous && dateKey(addDays(previous, 1)) === key ? current + 1 : 1;
        best = Math.max(best, current);
        previous = date;
    }
    return best;
}
function calculateRecord(type, workouts) {
    if (type === "best_weekly_streak") {
        return {
            recordType: type,
            value: calculateLongestStreak(workouts.map((row) => new Date(row.workoutDate))),
            unit: "days",
            workoutId: null,
            achievedAt: new Date(),
        };
    }
    const fieldByType = {
        longest_workout: { field: "durationMinutes", unit: "minutes" },
        most_calories: { field: "calories", unit: "calories" },
        highest_weight: { field: "weight", unit: "kg" },
        longest_distance: { field: "distance", unit: "km" },
    };
    const config = fieldByType[type];
    if (!config)
        return null;
    const best = [...workouts].sort((a, b) => Number(b[config.field] ?? 0) - Number(a[config.field] ?? 0))[0];
    if (!best || Number(best[config.field] ?? 0) <= 0)
        return null;
    return {
        recordType: type,
        value: Number(best[config.field] ?? 0),
        unit: config.unit,
        workoutId: best._id,
        achievedAt: best.completedAt ?? best.workoutDate ?? new Date(),
    };
}
