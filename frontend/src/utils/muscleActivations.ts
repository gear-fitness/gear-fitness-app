import type { BodyPartDTO } from "../api/exerciseService";
import type { WorkoutExercise } from "../api/types";
import type {
  BodyVariant,
  MuscleActivation,
  MuscleSlug,
} from "../components/MuscleDiagram";

/**
 * Maps each diagram muscle slug → the backend MuscleGroup enum values that
 * should light it up. FULL_BODY is included everywhere so full-body exercises
 * contribute to every muscle. Slugs absent from the backend enum
 * (neck, knees, tibialis, ankles) have no entry and stay at base color.
 */
export const SLUG_TO_GROUPS: Partial<Record<MuscleSlug, string[]>> = {
  chest: ["CHEST", "FULL_BODY"],
  abs: ["CORE", "FULL_BODY"],
  obliques: ["CORE", "FULL_BODY"],
  biceps: ["BICEPS", "FULL_BODY"],
  triceps: ["TRICEPS", "FULL_BODY"],
  trapezius: ["TRAPS", "FULL_BODY"],
  deltoids: ["SHOULDERS", "FULL_BODY"],
  forearm: ["FOREARMS", "FULL_BODY"],
  quadriceps: ["QUADS", "LEGS", "FULL_BODY"],
  adductors: ["LEGS", "FULL_BODY"],
  calves: ["CALVES", "LEGS", "FULL_BODY"],
  "upper-back": ["BACK", "FULL_BODY"],
  "lower-back": ["BACK", "FULL_BODY"],
  gluteal: ["GLUTES", "LEGS", "FULL_BODY"],
  hamstring: ["HAMSTRINGS", "LEGS", "FULL_BODY"],
};

/**
 * Intensity per muscle = sets-hitting-that-muscle / total-sets-in-workout.
 * Naturally clamped to [0, 1].
 */
export function computeActivations(
  exercises: WorkoutExercise[],
): MuscleActivation[] {
  const totalSets = exercises.reduce(
    (sum, ex) => sum + (ex.sets?.length ?? 0),
    0,
  );
  if (totalSets === 0) return [];

  return (Object.keys(SLUG_TO_GROUPS) as MuscleSlug[]).flatMap((slug) => {
    const groups = SLUG_TO_GROUPS[slug] ?? [];
    if (groups.length === 0) return [];
    const groupSet = new Set(groups);
    const setsHitting = exercises.reduce((sum, ex) => {
      const hits = ex.bodyParts.some((bp) => groupSet.has(bp.bodyPart));
      return hits ? sum + (ex.sets?.length ?? 0) : sum;
    }, 0);
    if (setsHitting === 0) return [];
    return [{ slug, intensity: setsHitting / totalSets }];
  });
}

/**
 * Activations for a single exercise's body parts (not a whole workout).
 * Primary targets → full intensity (1.0), secondary → half (0.5).
 * Used by ExerciseHistory to show which muscles an exercise hits.
 */
export function computeExerciseActivations(
  bodyParts: BodyPartDTO[],
): MuscleActivation[] {
  const primaryGroups = new Set(
    bodyParts
      .filter((bp) => bp.targetType === "PRIMARY")
      .map((bp) => bp.bodyPart),
  );
  const secondaryGroups = new Set(
    bodyParts
      .filter((bp) => bp.targetType === "SECONDARY")
      .map((bp) => bp.bodyPart),
  );

  return (Object.keys(SLUG_TO_GROUPS) as MuscleSlug[]).flatMap((slug) => {
    const groups = SLUG_TO_GROUPS[slug] ?? [];
    if (groups.length === 0) return [];
    if (groups.some((g) => primaryGroups.has(g))) {
      return [{ slug, intensity: 1.0 }];
    }
    if (groups.some((g) => secondaryGroups.has(g))) {
      return [{ slug, intensity: 0.5 }];
    }
    return [];
  });
}

/** Distinct muscle-group count for the "Muscles" stat on the share card. */
export function countDistinctMuscleGroups(
  exercises: WorkoutExercise[],
): number {
  const groups = new Set<string>();
  for (const ex of exercises) {
    for (const bp of ex.bodyParts) {
      // Exclude FULL_BODY and OTHER from the count — they're not specific.
      if (bp.bodyPart !== "FULL_BODY" && bp.bodyPart !== "OTHER") {
        groups.add(bp.bodyPart);
      }
    }
  }
  return groups.size;
}

const RED_STOPS_DARK = ["#5c0707", "#c20a0a", "#ff0a0a"] as const;
const RED_STOPS_LIGHT = ["#ffb3b3", "#ff3838", "#d40000"] as const;

function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

/** Continuous red ramp matching the DetailedHistory diagram. */
export function redFor(
  intensity: number,
  isDark: boolean,
  base: string,
): string {
  if (intensity <= 0) return base;
  const stops = isDark ? RED_STOPS_DARK : RED_STOPS_LIGHT;
  const t = Math.min(1, intensity);
  if (t <= 0.5) return lerpHex(stops[0], stops[1], t * 2);
  return lerpHex(stops[1], stops[2], (t - 0.5) * 2);
}

/** Strict-female rule: anything other than exact "female" is male. */
export function resolveBodyVariant(
  gender: string | null | undefined,
): BodyVariant {
  return gender?.trim().toLowerCase() === "female" ? "female" : "male";
}

/**
 * Default muscle-diagram palette derived from light/dark mode. Used by
 * in-app screens (history, exercise detail) so they don't each redefine
 * the same base/outline/red-ramp triple. Share card themes that aren't
 * tied to `isDark` build their own palette and skip this helper.
 */
export function defaultDiagramPalette(isDark: boolean) {
  const baseColor = isDark ? "#222" : "#cfcfcf";
  const outlineColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  return {
    baseColor,
    outlineColor,
    intensityToColor: (intensity: number) =>
      redFor(intensity, isDark, baseColor),
  };
}
