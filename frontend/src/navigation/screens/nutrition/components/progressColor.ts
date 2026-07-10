// How far past the goal (as a fraction of it) a reversed gauge takes to sweep
// from green to full red: 100% of budget is still green, 125% is solid red.
const OVERSHOOT_SPAN = 0.25;

/**
 * Maps a progress fraction (0..1, may exceed 1 when over goal) to a color on
 * the HSL hue sweep between red (0) and green (120). By default filling up is
 * good: red (not enough) through orange/yellow to green (goal met). With
 * `reverse` the gauge is a budget (calorie, carb, and fat gauges for users
 * cutting weight): it stays green anywhere at or under the budget and only
 * sweeps toward red once the goal is exceeded, reaching solid red at 25%
 * over. Protein is exempt by its callers: hitting the protein goal is good
 * on every goal type.
 */
export function progressColor(pct: number, reverse = false): string {
  if (reverse) {
    const over = Math.max(0, Math.min((pct - 1) / OVERSHOOT_SPAN, 1));
    return `hsl(${Math.round((1 - over) * 120)}, 75%, 45%)`;
  }
  const clamped = Math.max(0, Math.min(pct, 1));
  return `hsl(${Math.round(clamped * 120)}, 75%, 45%)`;
}
