/**
 * Maps a 0..1 progress fraction to a color that sweeps the HSL hue between
 * red (0) and green (120). By default filling up is good: red (not enough)
 * through orange/yellow to green (goal met). With `reverse` the sweep flips,
 * green (well under budget) to red (budget spent), which is how calorie,
 * carb, and fat gauges read for users cutting weight. Protein is exempt by
 * its callers: hitting the protein goal is good on every goal type.
 */
export function progressColor(pct: number, reverse = false): string {
  const clamped = Math.max(0, Math.min(pct, 1));
  const hue = Math.round((reverse ? 1 - clamped : clamped) * 120);
  return `hsl(${hue}, 75%, 45%)`;
}
