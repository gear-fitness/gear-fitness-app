/**
 * Streak tier utilities
 *
 * The streak flame "levels up" as the user reaches milestones. The displayed
 * icon is a pure function of the current streak value — it rises through tiers
 * as the streak grows and drops straight back to the inactive (grey) state the
 * moment the streak resets to 0. There is no high-water-mark memory.
 */
import type { ImageSourcePropType } from "react-native";

/** Day thresholds at which the flame changes (documented in one place). */
export const STREAK_MILESTONES = [1, 7, 30, 100, 200, 300] as const;

/**
 * Tiers ordered high → low. `getStreakTier` returns the first tier whose
 * `min` is <= the current streak, so any value between milestones holds the
 * lower tier's image (e.g. 50 days shows the 30-day flame).
 *
 * The 0-tier reuses the base (1-day) image; the component renders it as a flat
 * grey silhouette via `tintColor`, so no separate greyed asset is needed.
 */
// `color` is the flame's dominant hue for that tier — used as the accent for
// the profile activity grid so the heatmap "levels up" with the streak.
// Tier 0 reuses the base orange so a broken streak doesn't grey out the graph.
const STREAK_TIERS: {
  min: number;
  source: ImageSourcePropType;
  color: string;
}[] = [
  {
    min: 300,
    source: require("../../assets/streak/streak-300.png"),
    color: "#22ABFF",
  },
  {
    min: 200,
    source: require("../../assets/streak/streak-200.png"),
    color: "#9C2BE0",
  },
  {
    min: 100,
    source: require("../../assets/streak/streak-100.png"),
    color: "#E0218A",
  },
  {
    min: 30,
    source: require("../../assets/streak/streak-30.png"),
    color: "#F5301F",
  },
  {
    min: 7,
    source: require("../../assets/streak/streak-7.png"),
    color: "#FB4D2A",
  },
  {
    min: 1,
    source: require("../../assets/streak/streak-1.png"),
    color: "#FF6A1F",
  },
  {
    min: 0,
    source: require("../../assets/streak/streak-1.png"),
    color: "#FF6A1F",
  },
];

export interface StreakTier {
  /** The flame image for this streak length. */
  source: ImageSourcePropType;
  /** False only at streak 0, where the icon should render greyed out. */
  active: boolean;
}

/**
 * Select the flame image for a given streak length.
 * @param streak Current streak in days (negative/invalid values clamp to 0).
 */
function resolveTier(streak: number) {
  const days = Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0;
  return (
    STREAK_TIERS.find((t) => days >= t.min) ??
    STREAK_TIERS[STREAK_TIERS.length - 1]
  );
}

export function getStreakTier(streak: number): StreakTier {
  const days = Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0;
  return { source: resolveTier(days).source, active: days >= 1 };
}

/** The flame's dominant hue for this streak length — the activity-grid accent. */
export function getStreakAccentColor(streak: number): string {
  return resolveTier(streak).color;
}
