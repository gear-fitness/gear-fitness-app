import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import Svg, { Path, Circle, Polygon } from "react-native-svg";
import { useOnboardingColors } from "./useOnboardingColors";

const HEART = require("../../../../assets/apple-health-heart.png");
const GEAR = require("../../../../assets/GearLogo.png");

const CW = 300;
const CH = 196;

const LABELS: { text: string; left: number; top: number }[] = [
  { text: "Steps", left: 18, top: 26 },
  { text: "Workouts", left: 6, top: 64 },
  { text: "Heart rate", left: 200, top: 102 },
  { text: "Sleep", left: 218, top: 138 },
];

/** A "sync" hero: the Apple Health heart and the Gear app tile linked by
 *  curved arrows to a centre checkmark, with floating health-data labels. */
export function HealthSyncGraphic() {
  const colors = useOnboardingColors();
  const arrow = colors.text;

  return (
    <View style={styles.container}>
      {/* Soft background circle */}
      <View
        style={[
          styles.bgCircle,
          { backgroundColor: colors.isDark ? "#1C1C1E" : "#F2F1F7" },
        ]}
      />

      {/* Connecting arrows + checkmark */}
      <Svg width={CW} height={CH} style={StyleSheet.absoluteFill}>
        {/* Gear tile -> check (enters from above) */}
        <Path
          d="M176 66 C 160 66, 150 66, 150 76"
          stroke={arrow}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
        <Polygon points="150,81 146,73 154,73" fill={arrow} />

        {/* Health tile -> check (enters from below) */}
        <Path
          d="M124 126 C 142 126, 150 126, 150 116"
          stroke={arrow}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
        <Polygon points="150,111 146,119 154,119" fill={arrow} />

        {/* Checkmark badge */}
        <Circle cx={150} cy={96} r={15} fill={arrow} />
        <Path
          d="M143 96 L148 101 L157 90"
          stroke={colors.screenBg}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>

      {/* Apple Health tile */}
      <View style={[styles.tile, styles.healthTile]}>
        <Image source={HEART} style={styles.heart} resizeMode="contain" />
      </View>

      {/* Gear app tile */}
      <View style={[styles.tile, styles.gearTile]}>
        <Image source={GEAR} style={styles.gear} resizeMode="cover" />
      </View>

      {/* Floating data labels — top layer */}
      {LABELS.map((l) => (
        <View
          key={l.text}
          style={[
            styles.pill,
            { left: l.left, top: l.top, backgroundColor: colors.cardBg },
          ]}
        >
          <Text style={[styles.pillText, { color: colors.text }]}>
            {l.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const TILE = 74;

const styles = StyleSheet.create({
  container: {
    width: CW,
    height: CH,
    alignSelf: "center",
  },
  bgCircle: {
    position: "absolute",
    left: (CW - 188) / 2,
    top: 2,
    width: 188,
    height: 188,
    borderRadius: 94,
  },
  pill: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 13,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tile: {
    position: "absolute",
    width: TILE,
    height: TILE,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  healthTile: {
    left: 50,
    top: 96,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  gearTile: {
    left: 176,
    top: 22,
    backgroundColor: "#000",
  },
  heart: {
    width: 44,
    height: 44,
  },
  gear: {
    width: TILE,
    height: TILE,
  },
});
