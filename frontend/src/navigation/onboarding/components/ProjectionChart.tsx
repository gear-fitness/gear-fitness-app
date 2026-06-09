import React from "react";
import { View, Text, StyleSheet } from "react-native";
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
  height = 220,
}: ProjectionChartProps) {
  const colors = useOnboardingColors();

  const pad = { top: 44, bottom: 40, left: 26, right: 30 };
  const x0 = pad.left;
  const x1 = width - pad.right;
  const yHigh = pad.top;
  const yLow = height - pad.bottom;
  const startY = direction === "down" ? yHigh : yLow;
  const endY = direction === "down" ? yLow : yHigh;

  const c1x = x0 + (x1 - x0) * 0.45;
  const c2x = x0 + (x1 - x0) * 0.6;
  const curve = `M ${x0} ${startY} C ${c1x} ${startY}, ${c2x} ${endY}, ${x1} ${endY}`;
  const fill = `${curve} L ${x1} ${height - pad.bottom + 16} L ${x0} ${height - pad.bottom + 16} Z`;

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
          y1={yLow + 16}
          x2={x1}
          y2={yLow + 16}
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
          y={startY + (direction === "down" ? -16 : 24)}
          fill={lineColor}
          fontSize={15}
          fontWeight="700"
          textAnchor="start"
        >
          {startValue}
        </SvgText>
        <SvgText
          x={x1}
          y={endY + (direction === "down" ? 28 : -16)}
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
    marginTop: -22,
  },
  axisLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
});
