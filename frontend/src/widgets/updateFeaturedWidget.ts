import {
  getExerciseHistory,
  ExerciseHistory,
  ExerciseSession,
} from "../api/exerciseService";
import { getFeaturedExerciseId } from "./featuredExercise";
import {
  FeaturedExerciseWidget,
  FeaturedExerciseWidgetProps,
  EMPTY_FEATURED_EXERCISE_PROPS,
} from "./FeaturedExerciseWidget";

// Unicode block characters, low to high
const SPARK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

function buildSparkline(values: number[]): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return SPARK_CHARS[3].repeat(values.length);
  return values
    .map((v) => {
      const norm = (v - min) / range;
      const idx = Math.min(
        SPARK_CHARS.length - 1,
        Math.floor(norm * SPARK_CHARS.length),
      );
      return SPARK_CHARS[idx];
    })
    .join("");
}

function getSessionMax(session: ExerciseSession): number {
  const weights = session.sets
    .filter((s) => s.weightLbs != null)
    .map((s) => s.weightLbs!);
  return weights.length === 0 ? 0 : Math.max(...weights);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function buildWidgetProps(
  history: ExerciseHistory,
): FeaturedExerciseWidgetProps {
  // sessions are returned newest-first per your existing code
  const chronological = [...history.sessions].reverse();
  const sessionMaxes = chronological.map(getSessionMax).filter((v) => v > 0);
  const recentMaxes = sessionMaxes.slice(-8); // last 8 for sparkline
  const mostRecent = history.sessions[0];

  return {
    exerciseName: truncate(history.exerciseName, 22),
    bodyPart: history.bodyPart ?? "",
    prLbs: history.personalRecordLbs ?? null,
    lastSessionDate: mostRecent
      ? formatShortDate(mostRecent.datePerformed)
      : null,
    sparkline: buildSparkline(recentMaxes),
  };
}

/**
 * Pulls the user's featured exercise data and pushes it to the widget.
 * Safe to call opportunistically — if nothing's featured, shows empty state.
 * Swallows errors so a failed widget update never blocks app flow.
 */
export async function updateFeaturedWidget(): Promise<void> {
  try {
    const featuredId = await getFeaturedExerciseId();
    if (featuredId == null) {
      FeaturedExerciseWidget.updateSnapshot(EMPTY_FEATURED_EXERCISE_PROPS);
      return;
    }
    const history = await getExerciseHistory(featuredId);
    FeaturedExerciseWidget.updateSnapshot(buildWidgetProps(history));
  } catch (err) {
    console.warn("Failed to update featured exercise widget:", err);
    // Don't rethrow — widget update failures shouldn't break the app
  }
}
