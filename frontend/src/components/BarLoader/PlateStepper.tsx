import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Text } from "../Text";
import { WeightUnit } from "../../utils/weight";
import { formatNumber, plateColor, unitDisplay } from "../../utils/plateMath";

type Props = {
  denom: number;
  unit: WeightUnit;
  count: number;
  onChange: (next: number) => void;
  size?: number;
  /** Dim the plate when it cannot be used (e.g. zero pairs owned). */
  dimmed?: boolean;
};

/**
 * A plate rendered face-on as a colored disc, styled like a competition
 * plate: dark outline, inner rim ring, and a white hub in the exact
 * center carrying the count, flanked by minus / plus. Reused by the
 * reverse grid and the inventory sheet (where `count` is pairs owned).
 */
export function PlateStepper({
  denom,
  unit,
  count,
  onChange,
  size = 78,
  dimmed = false,
}: Props) {
  const color = plateColor(denom, unit);
  const hubSize = Math.round(size * 0.34);
  const step = (delta: number) => {
    const next = count + delta;
    if (next < 0) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color.bg,
          opacity: dimmed ? 0.35 : 1,
        },
      ]}
    >
      {/* Inner rim ring, like a plate's machined groove */}
      <View
        pointerEvents="none"
        style={[
          styles.rimRing,
          {
            top: 3,
            left: 3,
            right: 3,
            bottom: 3,
            borderRadius: (size - 6) / 2,
          },
        ]}
      />
      <Text style={styles.denom}>{formatNumber(denom)}</Text>
      <View style={styles.stepRow}>
        <TouchableOpacity
          accessibilityLabel={`Remove ${denom} ${unit} plate`}
          hitSlop={8}
          activeOpacity={0.6}
          onPress={() => step(-1)}
        >
          <MaterialCommunityIcons name="minus" size={17} style={styles.glyph} />
        </TouchableOpacity>
        <View
          style={[
            styles.hub,
            {
              width: hubSize,
              height: hubSize,
              borderRadius: hubSize / 2,
            },
          ]}
        >
          <Text style={styles.countText}>{count}</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel={`Add ${denom} ${unit} plate`}
          hitSlop={8}
          activeOpacity={0.6}
          onPress={() => step(1)}
        >
          <MaterialCommunityIcons name="plus" size={17} style={styles.glyph} />
        </TouchableOpacity>
      </View>
      <Text style={styles.unitLabel}>{unitDisplay(unit)}</Text>
    </View>
  );
}

const OUTLINE = "rgba(0,0,0,0.6)";

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    borderWidth: 1.5,
    borderColor: OUTLINE,
  },
  rimRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
  },
  denom: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  glyph: {
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hub: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1a1a1a",
    fontVariant: ["tabular-nums"],
  },
  unitLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
