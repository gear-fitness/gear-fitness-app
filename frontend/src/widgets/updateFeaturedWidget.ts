import {
  getExerciseHistory,
  ExerciseSession,
  ExerciseHistory,
} from "../api/exerciseService";
import { getFeaturedExerciseId } from "./featuredExercise";
import {
  FeaturedExerciseWidget,
  FeaturedExerciseWidgetProps,
  EMPTY_FEATURED_EXERCISE_PROPS,
} from "./FeaturedExerciseWidget";

const SPARK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

function buildSparkline(values: number[]): string {
  if (values.length < 2) return "—";
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
  const chronological = [...history.sessions].reverse();
  const sessionMaxes = chronological.map(getSessionMax).filter((v) => v > 0);
  const recentMaxes = sessionMaxes.slice(-8);
  const mostRecent = history.sessions[0];

  return {
    exerciseName: truncate(history.exerciseName, 22),
    bodyPart: history.bodyPart || "EXERCISE",
    prLbs: history.personalRecordLbs ?? 0,
    lastSessionDate: mostRecent
      ? formatShortDate(mostRecent.datePerformed)
      : "—",
    sparkline: buildSparkline(recentMaxes),
  };
}

/**
 * Fetches the featured exercise's data and pushes it to the widget.
 * Safe to call opportunistically — errors are swallowed.
 */
export async function updateFeaturedWidget(): Promise<void> {
  try {
    const featuredId = await getFeaturedExerciseId();
    console.log("[widget] featuredId:", featuredId);

    if (!featuredId) {
      FeaturedExerciseWidget.updateSnapshot(EMPTY_FEATURED_EXERCISE_PROPS);
      return;
    }

    const history = await getExerciseHistory(featuredId);
    console.log(
      "[widget] fetched history:",
      history.exerciseName,
      history.totalSessions,
      "sessions",
    );

    const props = buildWidgetProps(history);
    console.log("[widget] built props:", JSON.stringify(props));

    FeaturedExerciseWidget.updateSnapshot(props);
    console.log("[widget] updateSnapshot succeeded");
  } catch (err) {
    console.warn("Failed to update featured exercise widget:", err);
  }
}
