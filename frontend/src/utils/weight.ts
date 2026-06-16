// ──────────────────────────────────────────────────────────────
// Weight unit helpers
//
// The app stores and transports ALL weight in canonical pounds (the
// backend `weight_lbs` column, the workout submission payload, and the
// in-memory WorkoutSet.weight). The user's unit preference is purely a
// presentation/input concern: convert lbs → unit when rendering, and
// unit → lbs when committing a logged set.
//
// Pure + exported for testability, matching the convention in
// healthKitSync.ts (weightToKilograms / kilogramsToPounds).
// ──────────────────────────────────────────────────────────────

export type WeightUnit = "lbs" | "kg";

export const LBS_PER_KG = 2.2046226;

/** Canonical pounds → the user's display unit. kg rounded to 1 decimal. */
export function toDisplayWeight(lbs: number, unit: WeightUnit): number {
  if (unit === "kg") {
    return Math.round((lbs / LBS_PER_KG) * 10) / 10;
  }
  return lbs;
}

/** A value typed in the user's unit → canonical pounds (nearest lb). */
export function toLbs(value: number, unit: WeightUnit): number {
  if (unit === "kg") {
    return Math.round(value * LBS_PER_KG);
  }
  return Math.round(value);
}

/** "lbs" | "kg" — the short label shown next to a weight value. */
export function unitLabel(unit: WeightUnit): WeightUnit {
  return unit;
}

/**
 * Format a canonical-lbs value for display in the user's unit, e.g.
 * "185 lbs", "84 kg". Returns "Not set" for null/undefined/0 unless
 * `allowZero` is passed. Set `withUnit: false` to omit the suffix.
 */
export function formatWeight(
  lbs: number | null | undefined,
  unit: WeightUnit,
  opts?: { withUnit?: boolean; allowZero?: boolean },
): string {
  const withUnit = opts?.withUnit ?? true;
  if (lbs == null || (lbs === 0 && !opts?.allowZero)) return "Not set";
  const value = toDisplayWeight(lbs, unit);
  const num = Number.isInteger(value) ? String(value) : value.toString();
  return withUnit ? `${num} ${unit}` : num;
}
