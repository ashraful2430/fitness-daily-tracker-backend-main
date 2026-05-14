"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DASHBOARD_PROGRESS_CONFIG = void 0;
exports.clampScore = clampScore;
exports.computeDailyProgress = computeDailyProgress;
exports.DASHBOARD_PROGRESS_CONFIG = {
    login: { weight: 20 },
    learningFocus: { weight: 25, targetMinutes: 120 },
    workout: { weight: 25, targetCount: 1 },
    sections: { weight: 30 },
};
function clampScore(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
}
function computeDailyProgress(input) {
    const loginEarned = input.loggedInToday ? exports.DASHBOARD_PROGRESS_CONFIG.login.weight : 0;
    const combinedMinutes = (input.learningMinutes ?? 0) + (input.focusMinutes ?? 0);
    const learningFocusRatio = exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes > 0
        ? Math.min(combinedMinutes / exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes, 1)
        : 0;
    const workoutRatio = exports.DASHBOARD_PROGRESS_CONFIG.workout.targetCount > 0
        ? Math.min(input.workoutCount / exports.DASHBOARD_PROGRESS_CONFIG.workout.targetCount, 1)
        : 0;
    const sectionsRatio = input.totalSections > 0
        ? Math.min(input.completedSections / input.totalSections, 1)
        : 0;
    const learningFocusEarned = Math.round(exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.weight * learningFocusRatio);
    const workoutEarned = Math.round(exports.DASHBOARD_PROGRESS_CONFIG.workout.weight * workoutRatio);
    const sectionsEarned = Math.round(exports.DASHBOARD_PROGRESS_CONFIG.sections.weight * sectionsRatio);
    const totalEarned = clampScore(loginEarned + learningFocusEarned + workoutEarned + sectionsEarned);
    const missing = [];
    if (!input.loggedInToday) {
        missing.push("Log in today");
    }
    if (input.workoutCount < exports.DASHBOARD_PROGRESS_CONFIG.workout.targetCount) {
        missing.push("Complete one workout");
    }
    if (combinedMinutes < exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes) {
        missing.push(`Reach ${exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes} combined learning/focus minutes`);
    }
    if (input.totalSections > 0 && input.completedSections < input.totalSections) {
        missing.push("Complete all today's sections");
    }
    return {
        todayScore: totalEarned,
        dailyProgress: {
            percentage: totalEarned,
            breakdown: {
                login: {
                    earned: loginEarned,
                    max: exports.DASHBOARD_PROGRESS_CONFIG.login.weight,
                    completed: input.loggedInToday,
                },
                learningFocus: {
                    earned: learningFocusEarned,
                    max: exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.weight,
                    completed: combinedMinutes >= exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes,
                    learningMinutes: input.learningMinutes,
                    focusMinutes: input.focusMinutes,
                    combinedMinutes,
                    targetMinutes: exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes,
                    learningSessionsCount: input.learningSessionsCount,
                    focusSessionsCount: input.focusSessionsCount,
                },
                focus: {
                    earned: learningFocusEarned,
                    max: exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.weight,
                    completed: combinedMinutes >= exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes,
                    minutes: combinedMinutes,
                    targetMinutes: exports.DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes,
                },
                workout: {
                    earned: workoutEarned,
                    max: exports.DASHBOARD_PROGRESS_CONFIG.workout.weight,
                    completed: input.workoutCount >= exports.DASHBOARD_PROGRESS_CONFIG.workout.targetCount,
                    count: input.workoutCount,
                    targetCount: exports.DASHBOARD_PROGRESS_CONFIG.workout.targetCount,
                },
                sections: {
                    earned: sectionsEarned,
                    max: exports.DASHBOARD_PROGRESS_CONFIG.sections.weight,
                    completed: input.totalSections > 0 && input.completedSections >= input.totalSections,
                    completedSections: input.completedSections,
                    totalSections: input.totalSections,
                },
            },
            missing,
        },
    };
}
