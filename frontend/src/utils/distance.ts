/**
 * Distance unit conversion.
 *
 * The app collects and displays cardio distance in MILES, but the backend
 * column `distance_meters` stores METERS. Convert at the API boundary: miles ->
 * meters on submit, meters -> miles on read.
 */

export const METERS_PER_MILE = 1609.34;
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
