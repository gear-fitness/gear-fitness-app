/**
 * Cardio display helpers shared by the workout detail, history list and feed.
 */

/**
 * Format a cardio duration. Uses MM:SS for anything under an hour and
 * H:MM:SS once it crosses an hour, e.g. 1920 -> "32:00", 3723 -> "1:02:03".
 * The leading unit is unpadded; lower units are zero-padded.
 */
export function formatCardioDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

/**
 * Pluralize the cardio count for compact summaries, e.g. "1 cardio" /
 * "3 cardio". Kept singular-noun ("cardio") since it reads naturally either way.
 */
export function formatCardioCount(count: number): string {
  return `${count} cardio`;
}
