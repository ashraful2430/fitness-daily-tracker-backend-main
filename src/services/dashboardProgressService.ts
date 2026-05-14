export const DASHBOARD_PROGRESS_CONFIG = {
  login: { weight: 20 },
  learningFocus: { weight: 25, targetMinutes: 120 },
  workout: { weight: 25, targetCount: 1 },
  sections: { weight: 30 },
} as const;

type ProgressInput = {
  loggedInToday: boolean;
  learningMinutes: number;
  focusMinutes: number;
  learningSessionsCount: number;
  focusSessionsCount: number;
  workoutCount: number;
  completedSections: number;
  totalSections: number;
};

export function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeDailyProgress(input: ProgressInput) {
  const loginEarned = input.loggedInToday ? DASHBOARD_PROGRESS_CONFIG.login.weight : 0;
  const combinedMinutes = (input.learningMinutes ?? 0) + (input.focusMinutes ?? 0);
  const learningFocusRatio =
    DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes > 0
      ? Math.min(
          combinedMinutes / DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes,
          1,
        )
      : 0;
  const workoutRatio =
    DASHBOARD_PROGRESS_CONFIG.workout.targetCount > 0
      ? Math.min(input.workoutCount / DASHBOARD_PROGRESS_CONFIG.workout.targetCount, 1)
      : 0;
  const sectionsRatio =
    input.totalSections > 0
      ? Math.min(input.completedSections / input.totalSections, 1)
      : 0;

  const learningFocusEarned = Math.round(
    DASHBOARD_PROGRESS_CONFIG.learningFocus.weight * learningFocusRatio,
  );
  const workoutEarned = Math.round(DASHBOARD_PROGRESS_CONFIG.workout.weight * workoutRatio);
  const sectionsEarned = Math.round(
    DASHBOARD_PROGRESS_CONFIG.sections.weight * sectionsRatio,
  );

  const totalEarned = clampScore(
    loginEarned + learningFocusEarned + workoutEarned + sectionsEarned,
  );

  const missing: string[] = [];
  if (!input.loggedInToday) {
    missing.push("Log in today");
  }
  if (input.workoutCount < DASHBOARD_PROGRESS_CONFIG.workout.targetCount) {
    missing.push("Complete one workout");
  }
  if (combinedMinutes < DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes) {
    missing.push(
      `Reach ${DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes} combined learning/focus minutes`,
    );
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
          max: DASHBOARD_PROGRESS_CONFIG.login.weight,
          completed: input.loggedInToday,
        },
        learningFocus: {
          earned: learningFocusEarned,
          max: DASHBOARD_PROGRESS_CONFIG.learningFocus.weight,
          completed:
            combinedMinutes >= DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes,
          learningMinutes: input.learningMinutes,
          focusMinutes: input.focusMinutes,
          combinedMinutes,
          targetMinutes: DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes,
          learningSessionsCount: input.learningSessionsCount,
          focusSessionsCount: input.focusSessionsCount,
        },
        focus: {
          earned: learningFocusEarned,
          max: DASHBOARD_PROGRESS_CONFIG.learningFocus.weight,
          completed:
            combinedMinutes >= DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes,
          minutes: combinedMinutes,
          targetMinutes: DASHBOARD_PROGRESS_CONFIG.learningFocus.targetMinutes,
        },
        workout: {
          earned: workoutEarned,
          max: DASHBOARD_PROGRESS_CONFIG.workout.weight,
          completed:
            input.workoutCount >= DASHBOARD_PROGRESS_CONFIG.workout.targetCount,
          count: input.workoutCount,
          targetCount: DASHBOARD_PROGRESS_CONFIG.workout.targetCount,
        },
        sections: {
          earned: sectionsEarned,
          max: DASHBOARD_PROGRESS_CONFIG.sections.weight,
          completed:
            input.totalSections > 0 && input.completedSections >= input.totalSections,
          completedSections: input.completedSections,
          totalSections: input.totalSections,
        },
      },
      missing,
    },
  };
}
