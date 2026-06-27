import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../../../../hooks/useThemeColors";

/** A labelled progress bar showing consumed vs goal grams for one macro. */
export function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const t = useThemeColors();
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: t.secondary }]}>{label}</Text>
      <View style={styles.barWrap}>
        <View style={[styles.track, { backgroundColor: t.trackBg }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: color, width: `${pct * 100}%` },
            ]}
          />
        </View>
      </View>
      <Text style={[styles.value, { color: t.text }]}>
        {value}
        <Text style={{ color: t.secondary }}> / {goal}g</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  label: { width: 56, fontSize: 13 },
  barWrap: { flex: 1, marginHorizontal: 10 },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  value: { width: 80, fontSize: 13, textAlign: "right" },
});
