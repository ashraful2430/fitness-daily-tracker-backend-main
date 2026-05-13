export const DASHBOARD_PROGRESS_CONFIG = {
  login: { weight: 20 },
  focus: { weight: 25, targetMinutes: 120 },
  workout: { weight: 25, targetCount: 1 },
  sections: { weight: 30 },
} as const;

type ProgressInput = {
  loggedInToday: boolean;
  focusMinutes: number;
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
  const focusRatio =
    DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes > 0
      ? Math.min(input.focusMinutes / DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes, 1)
      : 0;
  const workoutRatio =
    DASHBOARD_PROGRESS_CONFIG.workout.targetCount > 0
      ? Math.min(input.workoutCount / DASHBOARD_PROGRESS_CONFIG.workout.targetCount, 1)
      : 0;
  const sectionsRatio =
    input.totalSections > 0
      ? Math.min(input.completedSections / input.totalSections, 1)
      : 0;

  const focusEarned = Math.round(DASHBOARD_PROGRESS_CONFIG.focus.weight * focusRatio);
  const workoutEarned = Math.round(DASHBOARD_PROGRESS_CONFIG.workout.weight * workoutRatio);
  const sectionsEarned = Math.round(
    DASHBOARD_PROGRESS_CONFIG.sections.weight * sectionsRatio,
  );

  const totalEarned = clampScore(
    loginEarned + focusEarned + workoutEarned + sectionsEarned,
  );

  const missing: string[] = [];
  if (!input.loggedInToday) {
    missing.push("Log in today");
  }
  if (input.workoutCount < DASHBOARD_PROGRESS_CONFIG.workout.targetCount) {
    missing.push("Complete one workout");
  }
  if (input.focusMinutes < DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes) {
    missing.push(
      `Reach ${DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes} focus minutes`,
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
        focus: {
          earned: focusEarned,
          max: DASHBOARD_PROGRESS_CONFIG.focus.weight,
          completed:
            input.focusMinutes >= DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes,
          minutes: input.focusMinutes,
          targetMinutes: DASHBOARD_PROGRESS_CONFIG.focus.targetMinutes,
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
