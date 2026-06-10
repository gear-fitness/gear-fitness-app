import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";

const H = 172; // scene height
const R = 134; // dial radius (sun/moon distance from the horizon pivot)
const SUN = 52;
const MOON = 42;

// A few stars scattered in the upper sky, revealed at night.
const STARS: { top: number; left: `${number}%`; size: number }[] = [
  { top: 26, left: "16%", size: 3 },
  { top: 54, left: "30%", size: 2 },
  { top: 20, left: "48%", size: 2.5 },
  { top: 64, left: "62%", size: 2 },
  { top: 34, left: "78%", size: 3 },
  { top: 78, left: "86%", size: 2 },
  { top: 90, left: "22%", size: 2 },
];

/** An animated sky that tracks the selected time of day (index 0–3:
 *  morning, midday, evening, anytime/night). A sun and moon sit on opposite
 *  ends of a dial that rotates across the horizon while the sky gradient
 *  cross-fades between dawn, day, dusk, and night. */
export function SkyScene({ index }: { index: number }) {
  const t = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: index,
      duration: 650,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, t]);

  const rotate = t.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: ["-68deg", "0deg", "68deg", "118deg"],
  });

  const op = (range: number[], out: number[]) =>
    t.interpolate({ inputRange: range, outputRange: out, extrapolate: "clamp" });

  const skies: { key: string; colors: [string, string]; opacity: any }[] = [
    { key: "dawn", colors: ["#FDEAC4", "#BFD8EE"], opacity: op([0, 1], [1, 0]) },
    {
      key: "day",
      colors: ["#6FC0F2", "#CFEBFF"],
      opacity: op([0, 1, 2], [0, 1, 0]),
    },
    {
      key: "dusk",
      colors: ["#F49B6A", "#6E5A93"],
      opacity: op([1, 2, 3], [0, 1, 0]),
    },
    {
      key: "night",
      colors: ["#243056", "#0C1326"],
      opacity: op([2, 3], [0, 1]),
    },
  ];

  const starOpacity = op([1, 2, 3], [0, 0.15, 1]);

  return (
    <View style={styles.sky}>
      {skies.map((s) => (
        <Animated.View
          key={s.key}
          style={[StyleSheet.absoluteFill, { opacity: s.opacity }]}
        >
          <LinearGradient colors={s.colors} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ))}

      <Animated.View
        pointerEvents="none"
        style={[styles.starField, { opacity: starOpacity }]}
      >
        {STARS.map((p, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
              },
            ]}
          />
        ))}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.pivot, { transform: [{ rotate }] }]}
      >
        <View style={[styles.body, { top: -R - SUN / 2, left: -SUN / 2 }]}>
          <SymbolView
            name="sun.max.fill"
            size={SUN}
            tintColor="#FFC73A"
            resizeMode="scaleAspectFit"
            style={{ width: SUN, height: SUN }}
          />
        </View>
        <View style={[styles.body, { top: R - MOON / 2, left: -MOON / 2 }]}>
          <SymbolView
            name="moon.stars.fill"
            size={MOON}
            tintColor="#EDF1FB"
            resizeMode="scaleAspectFit"
            style={{ width: MOON, height: MOON }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: {
    alignSelf: "stretch",
    height: H,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#6FC0F2",
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },
  pivot: {
    position: "absolute",
    left: "50%",
    top: H,
    width: 0,
    height: 0,
  },
  body: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
