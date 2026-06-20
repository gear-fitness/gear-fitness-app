import {
  DraftRoutine,
  DraftRoutineExercise,
  EquipmentOption,
  RoutineSplit,
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
// Names + body parts MUST mirror the seeded global exercises in the backend
// (R__seed_data.sql) so the routines seeded here resolve to real exerciseIds
// at sign-up instead of creating duplicate custom exercises. The seeded
// catalog is currently gym-based, so there is a single pool; reintroduce an
// equipment-specific pool once bodyweight/home exercises exist in the catalog.
const BENCH = ex("Bench Press", p("CHEST"), s("TRICEPS"), s("SHOULDERS"));
const INCLINE = ex(
  "Incline Bench Press",
  p("CHEST"),
  s("SHOULDERS"),
  s("TRICEPS"),
  s("CORE"),
);
const OHP = ex("Overhead Press", p("SHOULDERS"), s("TRICEPS"), s("CORE"));
const DIPS = ex("Tricep Dips", p("TRICEPS"), s("CHEST"), s("SHOULDERS"));
const ROW = ex("Barbell Row", p("BACK"), s("BICEPS"), s("FOREARMS"), s("CORE"));
const PULLDOWN = ex("Lat Pulldown", p("BACK"), s("BICEPS"), s("FOREARMS"));
const PULLUP = ex("Pull Up", p("BACK"), s("BICEPS"), s("FOREARMS"));
const CURL = ex("Dumbbell Curl", p("BICEPS"), s("FOREARMS"));
const SQUAT = ex("Squat", p("QUADS"), s("GLUTES"), s("HAMSTRINGS"), s("CORE"));
const LEG_PRESS = ex("Leg Press", p("QUADS"), s("GLUTES"));
const RDL = ex(
  "Romanian Deadlift",
  p("HAMSTRINGS"),
  s("GLUTES"),
  s("BACK"),
  s("FOREARMS"),
  s("CORE"),
);
const DEADLIFT = ex(
  "Deadlift",
  p("BACK"),
  s("HAMSTRINGS"),
  s("GLUTES"),
  s("QUADS"),
  s("FOREARMS"),
  s("CORE"),
);
const LEG_CURL = ex("Leg Curl", p("HAMSTRINGS"), s("CALVES"));
const CALF = ex("Calf Raise", p("CALVES"));

const POOL = {
  push: [BENCH, OHP, INCLINE, DIPS],
  pull: [PULLDOWN, ROW, PULLUP, CURL],
  legs: [SQUAT, RDL, LEG_PRESS, CALF],
  upper: [BENCH, ROW, OHP, PULLDOWN],
  lower: [SQUAT, RDL, LEG_PRESS, CALF],
  full: [SQUAT, BENCH, ROW, OHP],
  anterior: [BENCH, SQUAT, OHP, LEG_PRESS],
  posterior: [DEADLIFT, ROW, RDL, LEG_CURL],
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

/** Hard cap on routines seeded during onboarding, regardless of training days. */
export const MAX_ROUTINES = 3;

/** Build routines for a split the user explicitly chose. Respects their
 *  preferred training days; everything stays editable in the builder. */
export function routinesForSplit(
  split: RoutineSplit,
  input: TemplateInput,
): DraftRoutine[] {
  if (split === "auto") return recommendRoutines(input);

  const pool = POOL;
  const letter = (i: number) => String.fromCharCode(65 + i);

  // Each split yields a fixed set of routines (max MAX_ROUTINES), independent
  // of how many days per week the user chose. They can add/remove in the
  // builder. Scheduled days are spread across their preferred training days.
  if (split === "full_body") {
    const variants = [pool.full, pool.upper, pool.lower].slice(0, MAX_ROUTINES);
    const slots = pickDays(input.trainingDays, variants.length);
    return variants.map((exercises, i) => ({
      name: `Full Body ${letter(i)}`,
      scheduledDays: [slots[i % slots.length]],
      exercises,
    }));
  }

  const allSeq: [string, DraftRoutineExercise[]][] =
    split === "upper_lower"
      ? [
          ["Upper", pool.upper],
          ["Lower", pool.lower],
        ]
      : split === "anterior_posterior"
        ? [
            ["Anterior", pool.anterior],
            ["Posterior", pool.posterior],
          ]
        : [
            ["Push", pool.push],
            ["Pull", pool.pull],
            ["Legs", pool.legs],
          ];

  const seq = allSeq.slice(0, MAX_ROUTINES);
  const slots = pickDays(input.trainingDays, seq.length);
  return seq.map(([name, exercises], i) => ({
    name,
    scheduledDays: [slots[i % slots.length]],
    exercises,
  }));
}

/** Recommend a starter split from the intake answers. Used to seed the
 *  in-onboarding routine builder; everything stays editable. Capped to
 *  MAX_ROUTINES. */
export function recommendRoutines(input: TemplateInput): DraftRoutine[] {
  return buildRecommendation(input).slice(0, MAX_ROUTINES);
}

function buildRecommendation(input: TemplateInput): DraftRoutine[] {
  const days = Math.min(6, Math.max(2, input.daysPerWeek ?? 3));
  const pool = POOL;
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
