import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useOnboardingColors } from "./useOnboardingColors";
import { UnitToggle } from "./MetricPickers";
import { Weight } from "../types";
import { LBS_PER_KG } from "../../../utils/weight";

type Colors = ReturnType<typeof useOnboardingColors>;

const SPACING = 10; // px between unit ticks
const MAJOR_EVERY = 10; // taller tick every N units
const BAND_H = 96;
const MINOR_H = 26;
const MAJOR_H = 40;
const POINTER_H = 60;

/** A horizontal scrolling ruler — drag to pick a whole-number value.
 *  Snaps to each unit, fires a haptic tick on every change, and shows a
 *  fixed centre pointer. Renders the ruler band only; the big readout and
 *  any caption live above it in the parent. */
function RulerPicker({
  min,
  max,
  value,
  onChange,
  colors,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  colors: Colors;
}) {
  const count = max - min + 1;
  const [width, setWidth] = useState(0);
  const lastValueRef = useRef(value);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== width) setWidth(w);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    let idx = Math.round(x / SPACING);
    idx = Math.max(0, Math.min(count - 1, idx));
    const v = min + idx;
    if (v !== lastValueRef.current) {
      lastValueRef.current = v;
      Haptics.selectionAsync();
      onChange(v);
    }
  };

  const fade: [string, string] = colors.isDark
    ? ["#0a0a0a", "rgba(10,10,10,0)"]
    : ["#ffffff", "rgba(255,255,255,0)"];

  return (
    <View style={styles.band} onLayout={onLayout}>
      {width > 0 && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SPACING}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={handleScroll}
            // Start centred on the initial value — no left-to-centre jump.
            contentOffset={{ x: (value - min) * SPACING, y: 0 }}
            contentContainerStyle={{ paddingHorizontal: width / 2 }}
          >
            {Array.from({ length: count }, (_, i) => {
              const major = (min + i) % MAJOR_EVERY === 0;
              return (
                <View key={i} style={styles.tickCell}>
                  <View
                    style={[
                      styles.tick,
                      {
                        height: major ? MAJOR_H : MINOR_H,
                        backgroundColor: major
                          ? colors.border
                          : colors.separator,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </ScrollView>

          {/* Centre pointer */}
          <View
            pointerEvents="none"
            style={[
              styles.pointer,
              { left: width / 2 - 1.25, backgroundColor: colors.accent },
            ]}
          />

          {/* Edge fades so ticks dissolve into the background */}
          <LinearGradient
            pointerEvents="none"
            colors={fade}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fade, { left: 0 }]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={fade}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={[styles.fade, { right: 0 }]}
          />
        </>
      )}
    </View>
  );
}

/** Full weight control: big readout + caption + ruler + unit toggle.
 *  Emits a Weight whenever the value or unit changes. */
export function WeightRuler({
  initial,
  caption,
  onChange,
  colors,
}: {
  initial?: Weight;
  caption?: string;
  onChange: (w: Weight) => void;
  colors: Colors;
}) {
  const [unit, setUnit] = useState<"lbs" | "kg">(
    initial?.unit === "kg" ? "kg" : "lbs",
  );
  const [val, setVal] = useState(
    initial?.value ?? (initial?.unit === "kg" ? 75 : 165),
  );

  useEffect(() => {
    onChange({ unit, value: val });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, val]);

  const range = unit === "lbs" ? { min: 50, max: 400 } : { min: 20, max: 200 };

  const switchUnit = (next: "lbs" | "kg") => {
    if (next === unit) return;
    const converted =
      next === "kg"
        ? Math.round(val / LBS_PER_KG)
        : Math.round(val * LBS_PER_KG);
    setUnit(next);
    setVal(converted);
  };

  return (
    <View style={styles.wrap}>
      {caption ? (
        <Text style={[styles.caption, { color: colors.secondary }]}>
          {caption}
        </Text>
      ) : null}

      <Text style={[styles.readout, { color: colors.text }]}>
        {val}
        <Text style={styles.readoutDecimal}>.0</Text>
        <Text style={[styles.readoutUnit, { color: colors.secondary }]}>
          {" "}
          {unit}
        </Text>
      </Text>

      <RulerPicker
        key={unit}
        min={range.min}
        max={range.max}
        value={val}
        onChange={setVal}
        colors={colors}
      />

      <View style={styles.toggleWrap}>
        <UnitToggle
          active={unit}
          options={[
            { label: "lbs", value: "lbs" },
            { label: "kg", value: "kg" },
          ]}
          onChange={(v) => switchUnit(v as "lbs" | "kg")}
          colors={colors}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  caption: {
    fontSize: 17,
    fontWeight: "500",
    marginBottom: 6,
  },
  readout: {
    fontSize: 46,
    fontWeight: "700",
    letterSpacing: -1.5,
    marginBottom: 24,
  },
  readoutDecimal: {
    fontWeight: "700",
  },
  readoutUnit: {
    fontSize: 30,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  band: {
    alignSelf: "stretch",
    height: BAND_H,
    justifyContent: "center",
  },
  tickCell: {
    width: SPACING,
    alignItems: "flex-start",
    justifyContent: "center",
    height: BAND_H,
  },
  tick: {
    width: 1.5,
    borderRadius: 1,
  },
  pointer: {
    position: "absolute",
    width: 2.5,
    height: POINTER_H,
    borderRadius: 2,
    top: (BAND_H - POINTER_H) / 2,
  },
  fade: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 56,
  },
  toggleWrap: {
    marginTop: 28,
    width: 160,
  },
});
