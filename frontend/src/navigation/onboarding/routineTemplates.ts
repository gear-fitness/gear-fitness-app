import {
  DraftRoutine,
  DraftRoutineExercise,
  EquipmentOption,
  TrainingDay,
} from "./types";

type Bp = DraftRoutineExercise["bodyParts"][number];

const p = (bodyPart: string): Bp => ({ bodyPart, targetType: "PRIMARY" });
const s = (bodyPart: string): Bp => ({ bodyPart, targetType: "SECONDARY" });

const ex = (name: string, ...bodyParts: Bp[]): DraftRoutineExercise => ({
  name,
  bodyParts,
});

// ─── Exercise pools ──────────────────────────────────────────
const GYM = {
  push: [
    ex("Bench Press", p("CHEST"), s("TRICEPS"), s("SHOULDERS")),
    ex("Overhead Press", p("SHOULDERS"), s("TRICEPS")),
    ex("Incline Dumbbell Press", p("CHEST"), s("SHOULDERS")),
    ex("Tricep Pushdown", p("TRICEPS")),
  ],
  pull: [
    ex("Lat Pulldown", p("BACK"), s("BICEPS")),
    ex("Barbell Row", p("BACK"), s("BICEPS")),
    ex("Face Pull", p("SHOULDERS"), s("BACK")),
    ex("Bicep Curl", p("BICEPS")),
  ],
  legs: [
    ex("Barbell Squat", p("QUADS"), s("GLUTES")),
    ex("Romanian Deadlift", p("HAMSTRINGS"), s("GLUTES"), s("BACK")),
    ex("Leg Press", p("QUADS"), s("GLUTES")),
    ex("Calf Raise", p("CALVES")),
  ],
  upper: [
    ex("Bench Press", p("CHEST"), s("TRICEPS"), s("SHOULDERS")),
    ex("Barbell Row", p("BACK"), s("BICEPS")),
    ex("Overhead Press", p("SHOULDERS"), s("TRICEPS")),
    ex("Lat Pulldown", p("BACK"), s("BICEPS")),
  ],
  lower: [
    ex("Barbell Squat", p("QUADS"), s("GLUTES")),
    ex("Romanian Deadlift", p("HAMSTRINGS"), s("GLUTES"), s("BACK")),
    ex("Walking Lunge", p("QUADS"), s("GLUTES")),
    ex("Calf Raise", p("CALVES")),
  ],
  full: [
    ex("Barbell Squat", p("QUADS"), s("GLUTES")),
    ex("Bench Press", p("CHEST"), s("TRICEPS"), s("SHOULDERS")),
    ex("Barbell Row", p("BACK"), s("BICEPS")),
    ex("Overhead Press", p("SHOULDERS"), s("TRICEPS")),
  ],
};

const HOME = {
  push: [
    ex("Push-Up", p("CHEST"), s("TRICEPS"), s("SHOULDERS")),
    ex("Pike Push-Up", p("SHOULDERS"), s("TRICEPS")),
    ex("Dumbbell Shoulder Press", p("SHOULDERS"), s("TRICEPS")),
    ex("Tricep Dip", p("TRICEPS"), s("CHEST")),
  ],
  pull: [
    ex("Dumbbell Row", p("BACK"), s("BICEPS")),
    ex("Band Pull-Apart", p("BACK"), s("SHOULDERS")),
    ex("Dumbbell Curl", p("BICEPS")),
    ex("Superman Hold", p("BACK"), s("GLUTES")),
  ],
  legs: [
    ex("Goblet Squat", p("QUADS"), s("GLUTES")),
    ex("Bulgarian Split Squat", p("QUADS"), s("GLUTES")),
    ex("Glute Bridge", p("GLUTES"), s("HAMSTRINGS")),
    ex("Standing Calf Raise", p("CALVES")),
  ],
  upper: [
    ex("Push-Up", p("CHEST"), s("TRICEPS"), s("SHOULDERS")),
    ex("Dumbbell Row", p("BACK"), s("BICEPS")),
    ex("Pike Push-Up", p("SHOULDERS"), s("TRICEPS")),
    ex("Dumbbell Curl", p("BICEPS")),
  ],
  lower: [
    ex("Goblet Squat", p("QUADS"), s("GLUTES")),
    ex("Bulgarian Split Squat", p("QUADS"), s("GLUTES")),
    ex("Glute Bridge", p("GLUTES"), s("HAMSTRINGS")),
    ex("Standing Calf Raise", p("CALVES")),
  ],
  full: [
    ex("Goblet Squat", p("QUADS"), s("GLUTES")),
    ex("Push-Up", p("CHEST"), s("TRICEPS"), s("SHOULDERS")),
    ex("Dumbbell Row", p("BACK"), s("BICEPS")),
    ex("Glute Bridge", p("GLUTES"), s("HAMSTRINGS")),
  ],
};

const WEEK: TrainingDay[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function pickDays(preferred: TrainingDay[] | undefined, count: number) {
  const base = preferred && preferred.length > 0 ? preferred : WEEK;
  const days: TrainingDay[] = [];
  // Spread sessions across the available days as evenly as possible.
  for (let i = 0; i < count; i++) {
    days.push(
      base[Math.round((i * (base.length - 1)) / Math.max(1, count - 1))],
    );
  }
  return [...new Set(days)];
}

export interface TemplateInput {
  daysPerWeek?: number;
  trainingDays?: TrainingDay[];
  equipment?: EquipmentOption[];
}

/** Recommend a starter split from the intake answers. Used to seed the
 *  in-onboarding routine builder; everything stays editable. */
export function recommendRoutines(input: TemplateInput): DraftRoutine[] {
  const days = Math.min(6, Math.max(2, input.daysPerWeek ?? 3));
  const homeOnly =
    input.equipment !== undefined &&
    input.equipment.length > 0 &&
    !input.equipment.includes("full_gym") &&
    !input.equipment.includes("barbell") &&
    !input.equipment.includes("machines");
  const pool = homeOnly ? HOME : GYM;
  const slots = pickDays(input.trainingDays, days);
  const day = (i: number) => [slots[i % slots.length]];

  if (days <= 2) {
    return [
      { name: "Full Body A", scheduledDays: day(0), exercises: pool.full },
      { name: "Full Body B", scheduledDays: day(1), exercises: pool.upper },
    ];
  }
  if (days === 3) {
    return [
      { name: "Push Day", scheduledDays: day(0), exercises: pool.push },
      { name: "Pull Day", scheduledDays: day(1), exercises: pool.pull },
      { name: "Leg Day", scheduledDays: day(2), exercises: pool.legs },
    ];
  }
  if (days === 4) {
    return [
      { name: "Upper A", scheduledDays: day(0), exercises: pool.upper },
      { name: "Lower A", scheduledDays: day(1), exercises: pool.lower },
      { name: "Upper B", scheduledDays: day(2), exercises: pool.push },
      { name: "Lower B", scheduledDays: day(3), exercises: pool.legs },
    ];
  }
  if (days === 5) {
    return [
      { name: "Push Day", scheduledDays: day(0), exercises: pool.push },
      { name: "Pull Day", scheduledDays: day(1), exercises: pool.pull },
      { name: "Leg Day", scheduledDays: day(2), exercises: pool.legs },
      { name: "Upper Day", scheduledDays: day(3), exercises: pool.upper },
      { name: "Lower Day", scheduledDays: day(4), exercises: pool.lower },
    ];
  }
  return [
    { name: "Push A", scheduledDays: day(0), exercises: pool.push },
    { name: "Pull A", scheduledDays: day(1), exercises: pool.pull },
    { name: "Legs A", scheduledDays: day(2), exercises: pool.legs },
    { name: "Push B", scheduledDays: day(3), exercises: pool.push },
    { name: "Pull B", scheduledDays: day(4), exercises: pool.pull },
    { name: "Legs B", scheduledDays: day(5), exercises: pool.legs },
  ];
}
