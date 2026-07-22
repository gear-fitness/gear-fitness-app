import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../Text";
import { WeightUnit } from "../../utils/weight";
import { formatNumber, toOtherUnit, unitDisplay } from "../../utils/plateMath";

type Props = {
  total: number;
  unit: WeightUnit;
  textColor: string;
  mutedColor: string;
  scale?: number;
};

/**
 * The "160KG | 352.7LBS" readout: both units at equal weight, small caps
 * unit tucked against each number's baseline, thin divider between.
 */
export function DualReadout({
  total,
  unit,
  textColor,
  mutedColor,
  scale = 1,
}: Props) {
  const otherUnit: WeightUnit = unit === "kg" ? "lbs" : "kg";
  const main = formatNumber(Math.round(total * 100) / 100);
  const other = formatNumber(Math.round(toOtherUnit(total, unit) * 10) / 10);

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.value,
          {
            color: textColor,
            fontSize: 38 * scale,
            letterSpacing: -1 * scale,
          },
        ]}
      >
        {main}
      </Text>
      <Text style={[styles.unit, { color: mutedColor, fontSize: 14 * scale }]}>
        {unitDisplay(unit)}
      </Text>
      <View
        style={[
          styles.divider,
          {
            backgroundColor: mutedColor,
            width: 2.5 * scale,
            height: 30 * scale,
            marginHorizontal: 10 * scale,
            borderRadius: 1.5 * scale,
          },
        ]}
      />
      <Text
        style={[
          styles.value,
          {
            color: textColor,
            fontSize: 38 * scale,
            letterSpacing: -1 * scale,
          },
        ]}
      >
        {other}
      </Text>
      <Text style={[styles.unit, { color: mutedColor, fontSize: 14 * scale }]}>
        {unitDisplay(otherUnit)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  value: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  unit: {
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  divider: {
    alignSelf: "center",
  },
});
