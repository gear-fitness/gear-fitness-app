/**
 * Maps a 0..1 progress fraction to a color that sweeps from red (not enough)
 * through orange/yellow to green (goal met), by interpolating the HSL hue from
 * 0 (red) to 120 (green).
 */
export function progressColor(pct: number): string {
  const clamped = Math.max(0, Math.min(pct, 1));
  const hue = Math.round(clamped * 120); // 0 = red, 120 = green
  return `hsl(${hue}, 75%, 45%)`;
}
