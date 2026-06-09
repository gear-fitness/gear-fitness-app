import { DraftRoutineExercise } from "./types";

const p = (bodyPart: string) => ({ bodyPart, targetType: "PRIMARY" }) as const;
const s = (bodyPart: string) =>
  ({ bodyPart, targetType: "SECONDARY" }) as const;

const e = (
  name: string,
  ...bodyParts: DraftRoutineExercise["bodyParts"]
): DraftRoutineExercise => ({ name, bodyParts });

export interface ExerciseLibraryGroup {
  group: string;
  exercises: DraftRoutineExercise[];
}

/** Curated picker library for the in-onboarding routine builder. The live
 *  catalog requires auth (unavailable pre-signup), so these are resolved to
 *  real exerciseIds — creating any that don't exist — right after sign-up. */
export const EXERCISE_LIBRARY: ExerciseLibraryGroup[] = [
  {
    group: "Chest",
    exercises: [
      e("Bench Press", p("CHEST"), s("TRICEPS"), s("SHOULDERS")),
      e("Incline Dumbbell Press", p("CHEST"), s("SHOULDERS")),
      e("Push-Up", p("CHEST"), s("TRICEPS")),
      e("Cable Fly", p("CHEST")),
    ],
  },
  {
    group: "Back",
    exercises: [
      e("Lat Pulldown", p("BACK"), s("BICEPS")),
      e("Barbell Row", p("BACK"), s("BICEPS")),
      e("Dumbbell Row", p("BACK"), s("BICEPS")),
      e("Pull-Up", p("BACK"), s("BICEPS")),
      e("Deadlift", p("BACK"), s("HAMSTRINGS"), s("GLUTES")),
    ],
  },
  {
    group: "Shoulders",
    exercises: [
      e("Overhead Press", p("SHOULDERS"), s("TRICEPS")),
      e("Lateral Raise", p("SHOULDERS")),
      e("Face Pull", p("SHOULDERS"), s("BACK")),
    ],
  },
  {
    group: "Arms",
    exercises: [
      e("Bicep Curl", p("BICEPS")),
      e("Hammer Curl", p("BICEPS"), s("FOREARMS")),
      e("Tricep Pushdown", p("TRICEPS")),
      e("Tricep Dip", p("TRICEPS"), s("CHEST")),
    ],
  },
  {
    group: "Legs",
    exercises: [
      e("Barbell Squat", p("QUADS"), s("GLUTES")),
      e("Goblet Squat", p("QUADS"), s("GLUTES")),
      e("Romanian Deadlift", p("HAMSTRINGS"), s("GLUTES"), s("BACK")),
      e("Leg Press", p("QUADS"), s("GLUTES")),
      e("Walking Lunge", p("QUADS"), s("GLUTES")),
      e("Calf Raise", p("CALVES")),
    ],
  },
  {
    group: "Core",
    exercises: [
      e("Plank", p("CORE")),
      e("Hanging Leg Raise", p("CORE")),
      e("Cable Crunch", p("CORE")),
    ],
  },
];
