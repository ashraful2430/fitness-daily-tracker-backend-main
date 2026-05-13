"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DASHBOARD_PROGRESS_CONFIG = void 0;
exports.clampScore = clampScore;
exports.computeDailyProgress = computeDailyProgress;
exports.DASHBOARD_PROGRESS_CONFIG = {
    login: { weight: 20 },
    focus: { weight: 25, targetMinutes: 120 },
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
    const focusRatio = exports.DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes > 0
        ? Math.min(input.focusMinutes / exports.DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes, 1)
        : 0;
    const workoutRatio = exports.DASHBOARD_PROGRESS_CONFIG.workout.targetCount > 0
        ? Math.min(input.workoutCount / exports.DASHBOARD_PROGRESS_CONFIG.workout.targetCount, 1)
        : 0;
    const sectionsRatio = input.totalSections > 0
        ? Math.min(input.completedSections / input.totalSections, 1)
        : 0;
    const focusEarned = Math.round(exports.DASHBOARD_PROGRESS_CONFIG.focus.weight * focusRatio);
    const workoutEarned = Math.round(exports.DASHBOARD_PROGRESS_CONFIG.workout.weight * workoutRatio);
    const sectionsEarned = Math.round(exports.DASHBOARD_PROGRESS_CONFIG.sections.weight * sectionsRatio);
    const totalEarned = clampScore(loginEarned + focusEarned + workoutEarned + sectionsEarned);
    const missing = [];
    if (!input.loggedInToday) {
        missing.push("Log in today");
    }
    if (input.workoutCount < exports.DASHBOARD_PROGRESS_CONFIG.workout.targetCount) {
        missing.push("Complete one workout");
    }
    if (input.focusMinutes < exports.DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes) {
        missing.push(`Reach ${exports.DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes} focus minutes`);
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
                focus: {
                    earned: focusEarned,
                    max: exports.DASHBOARD_PROGRESS_CONFIG.focus.weight,
                    completed: input.focusMinutes >= exports.DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes,
                    minutes: input.focusMinutes,
                    targetMinutes: exports.DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes,
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
