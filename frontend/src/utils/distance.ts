/**
 * Distance unit conversion.
 *
 * The app collects and displays cardio distance in MILES, but the backend
 * column `distance_meters` stores METERS. Convert at the API boundary: miles ->
 * meters on submit, meters -> miles on read.
 */

export type DistanceUnit = "mi" | "km";

export const METERS_PER_MILE = 1609.34;
export const METERS_PER_KM = 1000;

// ──────────────────────────────────────────────────────────────
// Canonical-meters helpers (mirrors utils/weight.ts).
//
// Cardio distance is stored canonically in METERS — both the backend
// `distance_meters` column and the in-progress WorkoutContext CardioEntry.
// The user's distance unit (mi / km) is purely a presentation/input concern:
// convert meters → unit when rendering, and unit → meters when committing.
// ──────────────────────────────────────────────────────────────

/** Canonical meters → the user's display unit, rounded to 2 decimal places. */
export function toDisplayDistance(meters: number, unit: DistanceUnit): number {
  const perUnit = unit === "km" ? METERS_PER_KM : METERS_PER_MILE;
  return Math.round((meters / perUnit) * 100) / 100;
}

/** A value typed in the user's unit → canonical meters (full precision). */
export function distanceToMeters(value: number, unit: DistanceUnit): number {
  return unit === "km" ? value * METERS_PER_KM : value * METERS_PER_MILE;
}

/**
 * Format a canonical-meters value for display in the user's unit, e.g.
 * "3.1 mi" / "5 km". Returns null for null/undefined so callers can omit the
 * row entirely. Pass `withUnit: false` to omit the suffix.
 */
export function formatDistance(
  meters: number | null | undefined,
  unit: DistanceUnit,
  opts?: { withUnit?: boolean },
): string | null {
  // Guard null/undefined AND non-finite values so malformed server data can't
  // render as "NaN mi".
  if (meters == null || !Number.isFinite(meters)) return null;
  const withUnit = opts?.withUnit ?? true;
  const value = toDisplayDistance(meters, unit);
  const num = Number.isInteger(value) ? String(value) : value.toString();
  return withUnit ? `${num} ${unit}` : num;
}
