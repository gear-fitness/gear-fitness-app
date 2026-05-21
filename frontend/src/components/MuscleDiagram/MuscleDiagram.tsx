import React, { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { G, Path } from "react-native-svg";

import {
  getMuscles,
  getViewBox,
  type BackMuscleSlug,
  type BodySide,
  type BodyVariant,
  type FrontMuscleSlug,
  type MuscleDef,
  type MuscleSlug,
} from "./bodyData";

/**
 * Muscle activation entry from a workout.
 *
 * `intensity` is unitless — pass the relative load you've already computed
 * for the muscle (e.g. sets-volume, % of weekly target, normalized 0-1).
 * The caller-supplied `intensityToColor` maps it to a fill.
 *
 * `side` defaults to "both" so a slug like "biceps" lights up both arms;
 * pass "left" or "right" if you ever want to highlight just one side.
 */
export type MuscleActivation = {
  slug: MuscleSlug;
  intensity: number;
  side?: "left" | "right" | "both";
};

export type MuscleDiagramProps = {
  activations: MuscleActivation[];
  /** Which side of the body to render. */
  side: BodySide;
  /** Which body silhouette to render. Defaults to "male". */
  variant?: BodyVariant;
  /** intensity → fill color. Required — callers own the visual ramp. */
  intensityToColor: (intensity: number) => string;
  /** Fill for muscles with no activation. */
  baseColor: string;
  /** Stroke around each muscle. Set to "none" to disable. */
  outlineColor: string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

function buildLookup(
  activations: MuscleActivation[],
): Map<string, MuscleActivation> {
  const map = new Map<string, MuscleActivation>();
  for (const a of activations) {
    map.set(a.slug, a);
  }
  return map;
}

function fillForMuscle(
  slug: MuscleSlug,
  pathSide: "common" | "left" | "right",
  lookup: Map<string, MuscleActivation>,
  intensityToColor: (n: number) => string,
  baseColor: string,
): string {
  const activation = lookup.get(slug);
  if (!activation) return baseColor;
  const targetSide = activation.side ?? "both";
  if (
    pathSide === "common" ||
    targetSide === "both" ||
    targetSide === pathSide
  ) {
    return intensityToColor(activation.intensity);
  }
  return baseColor;
}

function renderMuscles(
  muscles: MuscleDef<FrontMuscleSlug | BackMuscleSlug>[],
  lookup: Map<string, MuscleActivation>,
  intensityToColor: (n: number) => string,
  baseColor: string,
  outlineColor: string,
) {
  const stroke = outlineColor === "none" ? undefined : outlineColor;
  return muscles.map((muscle) => (
    <G key={muscle.slug}>
      {(["common", "left", "right"] as const).flatMap((pathSide) => {
        const paths = muscle.paths[pathSide];
        if (!paths) return [];
        const fill = fillForMuscle(
          muscle.slug,
          pathSide,
          lookup,
          intensityToColor,
          baseColor,
        );
        return paths.map((d, i) => (
          <Path
            key={`${muscle.slug}-${pathSide}-${i}`}
            d={d}
            fill={fill}
            stroke={stroke}
            strokeWidth={stroke ? 1 : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ));
      })}
    </G>
  ));
}

export function MuscleDiagram({
  activations,
  side,
  variant = "male",
  intensityToColor,
  baseColor,
  outlineColor,
  width = 220,
  height,
  style,
}: MuscleDiagramProps) {
  const lookup = useMemo(() => buildLookup(activations), [activations]);

  const muscles = getMuscles(variant, side);
  const viewBox = getViewBox(variant);

  // viewBox is 580x1080; preserve aspect ratio when height is omitted.
  const aspect = 580 / 1080;
  const svgHeight = height ?? Math.round(width / aspect);

  return (
    <View style={[styles.container, style]}>
      <Svg
        width={width}
        height={svgHeight}
        viewBox={viewBox}
        accessibilityLabel={`muscle-diagram-${variant}-${side}`}
      >
        {renderMuscles(
          muscles as MuscleDef<FrontMuscleSlug | BackMuscleSlug>[],
          lookup,
          intensityToColor,
          baseColor,
          outlineColor,
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
});

export default MuscleDiagram;
