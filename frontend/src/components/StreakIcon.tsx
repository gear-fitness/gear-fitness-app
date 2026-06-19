import React from "react";
import { Image, StyleProp, ImageStyle } from "react-native";
import { getStreakTier } from "../utils/streak";

/** Flat grey used for the inactive (0-day) silhouette, per theme. */
const INACTIVE_TINT_DARK = "#6E6E6E";
const INACTIVE_TINT_LIGHT = "#BDBDBD";

/**
 * The elaborate 100/200-day flames render at the full passed `size`; lower
 * tiers are scaled down so they read as a smaller badge. 100+ keeps the
 * original size the app shipped with.
 */
const FULL_SIZE_MIN_STREAK = 100;
const SMALL_TIER_SCALE = 0.75;
/** The 300-day blue flame renders slightly larger than the other tiers. */
const LARGE_TIER_MIN_STREAK = 300;
const LARGE_TIER_SCALE = 1.12;

interface StreakIconProps {
  /** Current streak in days. Drives which flame tier renders. */
  streak: number;
  /** Rendered width and height in px (the flame art is square). */
  size: number;
  /** Adapts the 0-day grey silhouette to the surrounding background. */
  isDark?: boolean;
  style?: StyleProp<ImageStyle>;
}

/**
 * Streak flame icon. Shows the milestone-appropriate flame for `streak`, or a
 * flat grey silhouette when the streak is 0. See `utils/streak.ts` for tiers.
 */
export function StreakIcon({ streak, size, isDark, style }: StreakIconProps) {
  const tier = getStreakTier(streak);
  const renderSize =
    streak >= LARGE_TIER_MIN_STREAK
      ? Math.round(size * LARGE_TIER_SCALE)
      : streak >= FULL_SIZE_MIN_STREAK
        ? size
        : Math.round(size * SMALL_TIER_SCALE);
  const tintColor = tier.active
    ? undefined
    : isDark
      ? INACTIVE_TINT_DARK
      : INACTIVE_TINT_LIGHT;

  return (
    <Image
      // Remount when the tint toggles. Tier 0 and 1 share the same image file,
      // and iOS caches a once-tinted image in template mode — dropping the tint
      // would otherwise leave a black silhouette. A changing key forces a fresh,
      // full-color load.
      key={tintColor ? "grey" : "color"}
      source={tier.source}
      resizeMode="contain"
      accessibilityLabel={`${streak} day streak`}
      style={[{ width: renderSize, height: renderSize }, tintColor ? { tintColor } : null, style]}
    />
  );
}
