import React, { forwardRef, useMemo } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ColorValue,
} from "react-native";
import { MuscleDiagram, type BodyVariant } from "./MuscleDiagram";
import {
  computeActivations,
  countDistinctMuscleGroups,
  redFor,
} from "../utils/muscleActivations";
import type { WorkoutExercise } from "../api/types";

export type ShareCardTheme = "light" | "dark" | "transparent";

export type ShareWorkoutCardProps = {
  durationMin: number | null;
  exerciseCount: number;
  exercises: WorkoutExercise[];
  bodyVariant: BodyVariant;
  theme: ShareCardTheme;
  /** Card width in points. Height is locked to a 9:16 ratio. */
  width?: number;
};

const ASPECT = 9 / 16;
// Reference width that all internal sizes are tuned for. When the actual
// card width is smaller (e.g. clamped by available screen height), every
// internal dimension scales down by the same factor so the content stays
// visually consistent instead of cramming together.
const BASE_WIDTH = 320;
const G_LOGO = require("../assets/share-g.png");

function formatDuration(min: number | null): string {
  if (min == null || min <= 0) return "—";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

type Palette = {
  bg: ColorValue;
  text: string;
  muted: string;
  diagramBase: string;
  diagramOutline: string;
  diagramIsDark: boolean;
};

function paletteFor(theme: ShareCardTheme): Palette {
  if (theme === "light") {
    return {
      bg: "#fafafa",
      text: "#0a0a0a",
      muted: "rgba(0,0,0,0.5)",
      // Dark-mode diagram on the light template — muscles read as dark gray
      // silhouettes against the light card surface.
      diagramBase: "#222",
      diagramOutline: "rgba(255,255,255,0.06)",
      diagramIsDark: true,
    };
  }
  if (theme === "transparent") {
    // White text (overlaid on user content), but the diagram uses the light
    // palette so muscles read as light gray + red against arbitrary backgrounds.
    return {
      bg: "transparent",
      text: "#ffffff",
      muted: "rgba(255,255,255,0.55)",
      diagramBase: "#cfcfcf",
      diagramOutline: "rgba(0,0,0,0.08)",
      diagramIsDark: false,
    };
  }
  return {
    bg: "#0a0a0a",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.55)",
    // Light-mode diagram across all three templates for consistency.
    diagramBase: "#cfcfcf",
    diagramOutline: "rgba(0,0,0,0.08)",
    diagramIsDark: false,
  };
}

/**
 * Renders the shareable workout card. Designed to be captured via
 * react-native-view-shot — wrap the ref into the View ref and call captureRef.
 */
export const ShareWorkoutCard = forwardRef<View, ShareWorkoutCardProps>(
  function ShareWorkoutCard(
    {
      durationMin,
      exerciseCount,
      exercises,
      bodyVariant,
      theme,
      width = 320,
    },
    ref,
  ) {
    const height = Math.round(width / ASPECT);
    const palette = paletteFor(theme);
    const scale = width / BASE_WIDTH;

    const activations = useMemo(
      () => computeActivations(exercises),
      [exercises],
    );
    const muscleCount = useMemo(
      () => countDistinctMuscleGroups(exercises),
      [exercises],
    );

    const intensityToColor = useMemo(
      () => (intensity: number) =>
        redFor(intensity, palette.diagramIsDark, palette.diagramBase),
      [palette.diagramIsDark, palette.diagramBase],
    );

    const diagramWidth = Math.round(width * 0.36);
    const gLogoSize = Math.round(40 * scale);

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[
          styles.card,
          {
            width,
            height,
            backgroundColor: palette.bg,
            paddingVertical: 32 * scale,
            paddingHorizontal: 20 * scale,
            borderTopLeftRadius: 16 * scale,
            borderTopRightRadius: 16 * scale,
            borderBottomLeftRadius: 16 * scale,
            borderBottomRightRadius: 16 * scale,
          },
        ]}
      >
        <View
          style={[styles.metricsRow, { marginTop: 8 * scale, gap: 14 * scale }]}
        >
          <Metric label="TIME" value={formatDuration(durationMin)} palette={palette} scale={scale} />
          <Metric label="EXERCISES" value={`${exerciseCount} ex.`} palette={palette} scale={scale} />
          <Metric label="MUSCLES" value={`${muscleCount} groups`} palette={palette} scale={scale} />
        </View>

        <View style={[styles.diagramRow, { gap: 6 * scale }]}>
          <MuscleDiagram
            side="front"
            variant={bodyVariant}
            activations={activations}
            baseColor={palette.diagramBase}
            outlineColor={palette.diagramOutline}
            intensityToColor={intensityToColor}
            width={diagramWidth}
          />
          <MuscleDiagram
            side="back"
            variant={bodyVariant}
            activations={activations}
            baseColor={palette.diagramBase}
            outlineColor={palette.diagramOutline}
            intensityToColor={intensityToColor}
            width={diagramWidth}
          />
        </View>

        <View style={[styles.brandBlock, { gap: 6 * scale }]}>
          <Image
            source={G_LOGO}
            style={[
              { width: gLogoSize, height: gLogoSize, transform: [{ translateX: -1 * scale }] },
              theme === "light" && styles.gLogoInverted,
            ]}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.wordmark,
              {
                color: palette.text,
                fontSize: 18 * scale,
                letterSpacing: 1 * scale,
              },
            ]}
          >
            GEAR
          </Text>
        </View>
      </View>
    );
  },
);

function Metric({
  label,
  value,
  palette,
  scale,
}: {
  label: string;
  value: string;
  palette: Palette;
  scale: number;
}) {
  return (
    <View style={styles.metric}>
      <Text
        style={[
          styles.metricLabel,
          {
            color: palette.text,
            fontSize: 12 * scale,
            letterSpacing: 1.5 * scale,
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.metricValue,
          { color: palette.text, fontSize: 28 * scale },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout-only properties live here. Anything that needs to scale with the
  // card width (font sizes, paddings, gaps, radii) is applied inline at the
  // call site using a `scale = width / BASE_WIDTH` factor.
  card: {
    overflow: "hidden",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricsRow: {
    alignItems: "center",
    alignSelf: "stretch",
  },
  metric: {
    alignItems: "center",
  },
  metricLabel: {
    fontWeight: "800",
  },
  metricValue: {
    fontWeight: "700",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  diagramRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignSelf: "stretch",
    flex: 1,
    alignItems: "center",
  },
  brandBlock: {
    alignItems: "center",
  },
  gLogoInverted: {
    tintColor: "#0a0a0a",
  },
  wordmark: {
    // Same family as TIME / EXERCISES / MUSCLES (system default).
    fontWeight: "800",
  },
});
