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
export const KM_PER_MILE = 1.60934;

/** Convert miles to meters (no rounding — full precision for storage). */
export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
}

/** Convert meters to miles, rounded to 2 decimal places for display. */
export function metersToMiles(meters: number): number {
  return Math.round((meters / METERS_PER_MILE) * 100) / 100;
}

/** Convert miles to kilometers, rounded to 2 decimal places for display. */
export function milesToKm(miles: number): number {
  return Math.round(miles * KM_PER_MILE * 100) / 100;
}

/** Convert kilometers to miles, rounded to 2 decimal places. */
export function kmToMiles(km: number): number {
  return Math.round((km / KM_PER_MILE) * 100) / 100;
}

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

/** "mi" | "km" — the short label shown next to a distance value. */
export function distanceUnitLabel(unit: DistanceUnit): DistanceUnit {
  return unit;
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
  if (meters == null) return null;
  const withUnit = opts?.withUnit ?? true;
  const value = toDisplayDistance(meters, unit);
  const num = Number.isInteger(value) ? String(value) : value.toString();
  return withUnit ? `${num} ${unit}` : num;
}
