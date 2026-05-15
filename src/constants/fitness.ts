export const WORKOUT_TYPES = [
  "cardio",
  "strength",
  "hiit",
  "yoga",
  "walking",
  "running",
  "cycling",
  "sports",
  "stretching",
  "general",
] as const;

export const FITNESS_GOAL_TYPES = [
  "weight_loss",
  "muscle_gain",
  "general_fitness",
  "strength_training",
  "cardio_health",
  "flexibility",
  "daily_movement",
  "recovery",
] as const;

export const WORKOUT_INTENSITIES = [
  "easy",
  "medium",
  "hard",
  "extreme",
] as const;

export const BODY_PARTS = [
  "full_body",
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "cardio",
  "mobility",
] as const;

export const WORKOUT_MOODS = [
  "great",
  "good",
  "tired",
  "low_energy",
  "sore",
] as const;

export const WORKOUT_STATUSES = [
  "planned",
  "active",
  "completed",
  "skipped",
  "cancelled",
] as const;

export const SLEEP_QUALITIES = ["poor", "okay", "good", "excellent"] as const;
export const ENERGY_LEVELS = ["low", "medium", "high"] as const;
export const SORENESS_LEVELS = ["none", "light", "medium", "high"] as const;

export const PERSONAL_RECORD_TYPES = [
  "longest_workout",
  "most_calories",
  "highest_weight",
  "longest_distance",
  "best_weekly_streak",
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number];
export type FitnessGoalType = (typeof FITNESS_GOAL_TYPES)[number];
export type WorkoutIntensity = (typeof WORKOUT_INTENSITIES)[number];
export type BodyPart = (typeof BODY_PARTS)[number];
export type WorkoutMood = (typeof WORKOUT_MOODS)[number];
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];
export type SleepQuality = (typeof SLEEP_QUALITIES)[number];
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];
export type SorenessLevel = (typeof SORENESS_LEVELS)[number];
export type PersonalRecordType = (typeof PERSONAL_RECORD_TYPES)[number];
