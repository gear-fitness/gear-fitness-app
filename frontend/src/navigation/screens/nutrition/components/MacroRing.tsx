import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Text, TextInput } from "../../../../components/Text";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { progressColor } from "./progressColor";

// The progress arc is a reanimated Circle so its strokeDashoffset can be driven
// on the UI thread (see the fill animation below).
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Entry animation timing for the arc fill; matches the calorie bar on the
// tracker screen so both read as one motion.
const FILL_DURATION = 600;
const FILL_EASING = Easing.out(Easing.cubic);

/**
 * A circular macro gauge: a gray track with a progress arc that fills clockwise
 * from the top as `value` approaches `goal`, coloring red → green by how close
 * to the goal the user is (or green → red with `reverse`, for budget-style
 * gauges on a cut). The current value is shown in the center — as an
 * editable field when `onChangeText` is supplied.
 */
export function MacroRing({
  label,
  value,
  goal,
  size = 84,
  stroke = 7,
  valueText,
  onChangeText,
  valueFontSize = 19,
  labelFontSize = 13,
  labelColor,
  labelBold,
  showGoal,
  animateKey,
  reverse,
}: {
  label: string;
  value: number;
  goal: number;
  size?: number;
  stroke?: number;
  /** When set with `onChangeText`, the center becomes an editable number. */
  valueText?: string;
  onChangeText?: (v: string) => void;
  /** Center-number font size — shrink for compact inline rings. */
  valueFontSize?: number;
  /** Bottom-label font size — shrink for compact inline rings. */
  labelFontSize?: number;
  /** Bottom-label color (e.g. the macro's identity color); secondary otherwise. */
  labelColor?: string;
  /** Bold the bottom label (the tracker's expanded card). */
  labelBold?: boolean;
  /** Render the center as a `value/goal` fraction instead of the bare value.
   *  The "/goal" tail is greyed, matching the tracker's calorie readout. */
  showGoal?: boolean;
  /**
   * Changing this resets the arc to empty and refills it (used to replay the
   * entry animation when the tracker switches days). When it stays the same but
   * `value`/`goal` change, the arc animates smoothly to the new offset instead.
   */
  animateKey?: string | number;
  /** Flip the color sweep to green → red: filling this gauge is bad (calorie,
   *  carb, and fat budgets while cutting weight). Protein never reverses. */
  reverse?: boolean;
}) {
  const t = useThemeColors();
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Fraction of the arc drawn, animated on the UI thread. strokeDashoffset goes
  // from the full circumference (empty) at 0 to 0 (full) at 1.
  const progress = useSharedValue(0);

  // Replay from empty whenever animateKey flips (e.g. a new day is selected).
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(pct, {
      duration: FILL_DURATION,
      easing: FILL_EASING,
    });
    // Only the key drives the reset; pct is read at replay time on purpose.
  }, [animateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ease to the new fill when value/goal change without a key change (a data
  // refresh, or live edits from the EditEntrySheet's onChangeText field).
  useEffect(() => {
    progress.value = withTiming(pct, {
      duration: FILL_DURATION,
      easing: FILL_EASING,
    });
  }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedProps = useAnimatedProps(
    () => ({
      strokeDashoffset: circumference * (1 - progress.value),
    }),
    [circumference],
  );

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
          {/* Progress arc — starts at top (rotate -90), fills clockwise. The
              offset animates via animatedProps; the color is the final color
              for the current pct (not animated). Hidden at pct 0 so the rounded
              cap doesn't leave a dot on an empty ring. */}
          {pct > 0 && (
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke={progressColor(pct, reverse)}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              strokeLinecap="round"
              rotation={-90}
              originX={center}
              originY={center}
            />
          )}
        </Svg>
        <View style={styles.center}>
          {onChangeText ? (
            <TextInput
              value={valueText}
              onChangeText={onChangeText}
              keyboardType="number-pad"
              selectTextOnFocus
              maxFontSizeMultiplier={1.2}
              style={[styles.value, styles.valueInput, { color: t.text }]}
            />
          ) : (
            <Text
              style={[styles.value, { color: t.text, fontSize: valueFontSize }]}
              maxFontSizeMultiplier={1.2}
            >
              {value}
              {showGoal && <Text style={{ color: t.secondary }}>/{goal}</Text>}
            </Text>
          )}
        </View>
      </View>
      {label !== "" && (
        <Text
          style={[
            styles.label,
            { color: labelColor ?? t.secondary, fontSize: labelFontSize },
            labelBold && styles.labelBold,
          ]}
        >
          {label}
        </Text>
      )}
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
  valueInput: {
    padding: 0,
    textAlign: "center",
    minWidth: 54,
  },
  label: { fontSize: 13, fontWeight: "600", marginTop: 8 },
  labelBold: { fontWeight: "700" },
});
