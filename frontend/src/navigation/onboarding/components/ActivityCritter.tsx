import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { SymbolView } from "expo-symbols";

export type CritterKind = "couch" | "turtle" | "bunny" | "bird";

type Motion = { axis: "x" | "y"; amp: number; dur: number } | null;

// Each critter's "in colour" tint, how it moves while selected, and the
// SF Symbol that draws it.
const CONFIG: Record<
  CritterKind,
  { color: string; motion: Motion; symbol: string }
> = {
  couch: { color: "#9AA0A6", motion: null, symbol: "sofa.fill" },
  turtle: {
    color: "#2E9E5B",
    motion: { axis: "x", amp: 3, dur: 1400 },
    symbol: "tortoise.fill",
  },
  bunny: {
    color: "#B0764F",
    motion: { axis: "y", amp: 5, dur: 460 },
    symbol: "hare.fill",
  },
  bird: {
    color: "#8A5A2B",
    motion: { axis: "y", amp: 5, dur: 300 },
    symbol: "bird.fill",
  },
};

/** Minimal animal glyph. Grey + still when inactive; tinted and animated
 *  (at the kind's own pace) when its activity level is selected. */
export function ActivityCritter({
  kind,
  active,
  idleColor,
  size = 40,
}: {
  kind: CritterKind;
  active: boolean;
  idleColor: string;
  size?: number;
}) {
  const cfg = CONFIG[kind];
  const fill = active ? cfg.color : idleColor;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active && cfg.motion) {
      const { dur } = cfg.motion;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: dur,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: -1,
            duration: dur,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Continue from where each cycle ends — no snap back to start.
        { resetBeforeIteration: false },
      );
      loop.start();
      return () => {
        loop.stop();
        anim.setValue(0);
      };
    }
    anim.setValue(0);
    return undefined;
  }, [active, kind, cfg.motion, anim]);

  const amp = cfg.motion?.amp ?? 0;
  const translate = anim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-amp, amp],
  });
  const transform =
    cfg.motion?.axis === "y"
      ? [{ translateY: translate }]
      : [{ translateX: translate }];

  return (
    <Animated.View style={{ transform }}>
      <SymbolView
        name={cfg.symbol as React.ComponentProps<typeof SymbolView>["name"]}
        size={size}
        tintColor={fill}
        resizeMode="scaleAspectFit"
        style={{ width: size, height: size * 0.7 }}
      />
    </Animated.View>
  );
}
