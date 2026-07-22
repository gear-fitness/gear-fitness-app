import React, { forwardRef } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Text, FontScaleProvider } from "../Text";
import { WeightUnit } from "../../utils/weight";
import { StackPlate } from "../../utils/plateMath";
import { BarbellDiagram, COLLAR_X } from "./BarbellDiagram";
import { DualReadout } from "./DualReadout";

const G_LOGO = require("../../assets/share-g.png");

type Props = {
  /** One side's plates as an ordered stack, bottom first. */
  plates: StackPlate[];
  unit: WeightUnit;
  barWeight: number;
  collarPerSide: number;
  total: number;
  width?: number;
};

// 4:5, tuned for feed/story crops. The background is transparent so the
// captured PNG overlays whatever the user shares it onto, mirroring
// ShareWorkoutCard's transparent theme: white text over user content,
// and the plate/readout outlines keep it legible on light backgrounds.
const ASPECT = 4 / 5;
const BASE_WIDTH = 320;
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.55)";

/**
 * Capture target for sharing a loaded bar. Rendered offscreen by the
 * BarLoader screen and captured with react-native-view-shot, mirroring
 * the ShareWorkoutCard pipeline.
 */
export const BarShareCard = forwardRef<View, Props>(function BarShareCard(
  { plates, unit, barWeight, collarPerSide, total, width = 320 },
  ref,
) {
  const height = Math.round(width / ASPECT);
  const scale = width / BASE_WIDTH;

  return (
    <FontScaleProvider max={1}>
      <View
        ref={ref}
        collapsable={false}
        style={[styles.card, { width, height, gap: 10 * scale }]}
      >
        <BarbellDiagram
          plates={plates}
          barWeight={barWeight}
          collarPerSide={collarPerSide}
          width={Math.round(width * 0.97)}
          height={Math.round(210 * scale)}
        />

        {/* The diagram is card-centered, so the loaded span (collar
            through sleeve end) has its midpoint COLLAR_X / 2 right of the
            card's center; shift the readout and brand to match it. */}
        <View style={styles.loadedSpanCenter}>
          <DualReadout
            total={total}
            unit={unit}
            textColor={TEXT}
            mutedColor={MUTED}
            scale={scale * 1.25}
          />
        </View>

        <View
          style={[
            styles.brandBlock,
            styles.loadedSpanCenter,
            { gap: 6 * scale },
          ]}
        >
          <Image
            source={G_LOGO}
            style={{ width: 28 * scale, height: 28 * scale }}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.wordmark,
              { color: TEXT, fontSize: 15 * scale, letterSpacing: 1 * scale },
            ]}
          >
            GEAR
          </Text>
        </View>
      </View>
    </FontScaleProvider>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadedSpanCenter: {
    transform: [{ translateX: COLLAR_X / 2 }],
  },
  wordmark: {
    fontWeight: "800",
  },
});
