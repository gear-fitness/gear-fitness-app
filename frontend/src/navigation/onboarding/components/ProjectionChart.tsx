import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../../../components/Text";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  Line,
} from "react-native-svg";
import { useOnboardingColors } from "./useOnboardingColors";

interface ProjectionChartProps {
  startLabel: string;
  endLabel: string;
  startValue: string;
  endValue: string;
  /** Curve rises toward the goal (muscle/performance) or descends (fat loss). */
  direction: "up" | "down";
  width: number;
  height?: number;
}

/** Smooth cubic projection curve with gradient fill — the
 *  "progress toward goal" visual used on chart screens. */
export function ProjectionChart({
  startLabel,
  endLabel,
  startValue,
  endValue,
  direction,
  width,
  height = 230,
}: ProjectionChartProps) {
  const colors = useOnboardingColors();

  const pad = { top: 44, bottom: 60, left: 26, right: 30 };
  const x0 = pad.left;
  const x1 = width - pad.right;
  const yHigh = pad.top;
  const yLow = height - pad.bottom;
  // Baseline (and the timeline row beneath it) sits well below the lowest
  // point, leaving room for the bottom endpoint value in between.
  const baselineY = yLow + 30;
  const startY = direction === "down" ? yHigh : yLow;
  const endY = direction === "down" ? yLow : yHigh;

  // A top point's value goes above it; a bottom point's value tucks between
  // the point and the baseline — never down in the timeline row.
  const labelY = (y: number) => (y === yHigh ? yHigh - 16 : yLow + 21);

  const c1x = x0 + (x1 - x0) * 0.45;
  const c2x = x0 + (x1 - x0) * 0.6;
  const curve = `M ${x0} ${startY} C ${c1x} ${startY}, ${c2x} ${endY}, ${x1} ${endY}`;
  const fill = `${curve} L ${x1} ${baselineY} L ${x0} ${baselineY} Z`;

  const lineColor = colors.text;
  const labelColor = colors.secondary;

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={lineColor}
              stopOpacity={colors.isDark ? 0.28 : 0.16}
            />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line
          x1={x0}
          y1={baselineY}
          x2={x1}
          y2={baselineY}
          stroke={colors.separator}
          strokeWidth={1}
        />
        <Path d={fill} fill="url(#projFill)" />
        <Path
          d={curve}
          stroke={lineColor}
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={x0} cy={startY} r={7} fill={colors.screenBg} />
        <Circle
          cx={x0}
          cy={startY}
          r={6}
          fill={lineColor}
          stroke={colors.screenBg}
          strokeWidth={2.5}
        />
        <Circle
          cx={x1}
          cy={endY}
          r={8}
          fill={lineColor}
          stroke={colors.screenBg}
          strokeWidth={2.5}
        />
        <SvgText
          x={x0}
          y={labelY(startY)}
          fill={lineColor}
          fontSize={15}
          fontWeight="700"
          textAnchor="start"
        >
          {startValue}
        </SvgText>
        <SvgText
          x={x1}
          y={labelY(endY)}
          fill={lineColor}
          fontSize={15}
          fontWeight="700"
          textAnchor="end"
        >
          {endValue}
        </SvgText>
      </Svg>
      <View style={styles.axisRow}>
        <Text style={[styles.axisLabel, { color: labelColor }]}>
          {startLabel}
        </Text>
        <Text style={[styles.axisLabel, { color: labelColor }]}>
          {endLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginTop: -24,
  },
  axisLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
});
