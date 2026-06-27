import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { progressColor } from "./progressColor";

/**
 * A circular macro gauge: a gray track with a progress arc that fills clockwise
 * from the top as `value` approaches `goal`, coloring red → green by how close
 * to the goal the user is. The current value is shown in the center.
 */
export function MacroRing({
  label,
  value,
  goal,
  size = 84,
  stroke = 7,
}: {
  label: string;
  value: number;
  goal: number;
  size?: number;
  stroke?: number;
}) {
  const t = useThemeColors();
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={t.trackBg}
            strokeWidth={stroke}
            fill="none"
          />
          {/* Progress arc — starts at top (rotate -90), fills clockwise */}
          {pct > 0 && (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={progressColor(pct)}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              rotation={-90}
              originX={center}
              originY={center}
            />
          )}
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.value, { color: t.text }]}>{value}</Text>
        </View>
      </View>
      <Text style={[styles.label, { color: t.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 19, fontWeight: "700" },
  label: { fontSize: 13, marginTop: 8 },
});
