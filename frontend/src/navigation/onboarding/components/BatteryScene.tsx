import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useOnboardingColors } from "./useOnboardingColors";

const BW = 210; // battery body width
const BH = 96; // battery body height
const BORDER = 3;
const PAD = 7;
const INNER_W = BW - 2 * BORDER - 2 * PAD;
const INNER_H = BH - 2 * BORDER - 2 * PAD;

// Charge fraction + fill colour per option index (30, 45, 60, 90 min).
const FRACS = [0.28, 0.5, 0.72, 1.0];
const COLORS = ["#FF9F0A", "#FFCC00", "#7BD13B", "#34C759"];
const WIDTHS = FRACS.map((f) => f * INNER_W);

/** An animated charging battery for the selected session length
 *  (index 0–3 = 30/45/60/90 min). The fill grows and shifts amber → green
 *  as the duration increases, with a charging bolt pulsing in the centre. */
export function BatteryScene({ index }: { index: number }) {
  const colors = useOnboardingColors();
  const frame = colors.text;

  const t = useRef(new Animated.Value(index)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // Charge level/colour animate on the JS thread (width + backgroundColor).
  useEffect(() => {
    Animated.timing(t, {
      toValue: index,
      duration: 600,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [index, t]);

  // Gentle charging pulse on the bolt (native thread).
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const fillWidth = t.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: WIDTHS,
  });
  const fillColor = t.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: COLORS,
  });
  const boltOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });
  const boltScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.08],
  });

  return (
    <View style={styles.scene}>
      <View style={styles.row}>
        <View
          style={[
            styles.body,
            { borderColor: frame, backgroundColor: colors.separator },
          ]}
        >
          <Animated.View
            style={[
              styles.fill,
              { width: fillWidth, backgroundColor: fillColor },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.boltWrap,
              { opacity: boltOpacity, transform: [{ scale: boltScale }] },
            ]}
          >
            <Svg width={30} height={46} viewBox="0 0 24 36">
              <Path
                d="M13 1 L3 21 L11 21 L9 35 L21 13 L13 13 Z"
                fill="#fff"
                stroke={frame}
                strokeWidth={1.2}
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
        </View>
        <View style={[styles.terminal, { backgroundColor: frame }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    alignSelf: "stretch",
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  body: {
    width: BW,
    height: BH,
    borderWidth: BORDER,
    borderRadius: 22,
    padding: PAD,
    justifyContent: "center",
    alignItems: "flex-start",
    overflow: "hidden",
  },
  fill: {
    height: INNER_H,
    borderRadius: 12,
  },
  boltWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  terminal: {
    width: 9,
    height: 44,
    marginLeft: 4,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
});
