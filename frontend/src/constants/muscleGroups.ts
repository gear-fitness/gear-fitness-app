export const MUSCLE_GROUPS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "QUADS",
  "HAMSTRINGS",
  "GLUTES",
  "CALVES",
  "CORE",
  "TRAPS",
  "FOREARMS",
  "FULL_BODY",
  "OTHER",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
