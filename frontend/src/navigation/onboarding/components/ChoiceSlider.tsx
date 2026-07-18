import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../../../components/Text";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { useOnboardingColors } from "./useOnboardingColors";
import { ActivityCritter, CritterKind } from "./ActivityCritter";

export interface SliderOption<V extends string | number> {
  value: V;
  /** Full label shown large above the slider. */
  label: string;
  /** Short label shown under its stop. Falls back to `label`. */
  short?: string;
  hint?: string;
  /** Optional animal silhouette shown under this stop. */
  critter?: CritterKind;
}

/** Discrete, drag-to-select slider using the native iOS/Android slider —
 *  giving the system "liquid glass" look and haptic detents. */
export function ChoiceSlider<V extends string | number>({
  options,
  value,
  onChange,
  defaultValue,
}: {
  options: SliderOption<V>[];
  value?: V;
  onChange: (v: V) => void;
  defaultValue?: V;
}) {
  const colors = useOnboardingColors();
  const n = options.length;

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Default-select the middle stop on mount so the thumb reflects a real value.
  useEffect(() => {
    if (value == null) {
      onChange(defaultValue ?? options[Math.floor((n - 1) / 2)].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const idx = selectedIndex >= 0 ? selectedIndex : Math.floor((n - 1) / 2);
  const lastIdxRef = useRef(idx);

  // A short burst of ticks when clicking into a stop — a "rolling" detent
  // feel even though the thumb hard-locks to one of the set positions.
  const rollBurst = () => {
    Haptics.selectionAsync();
    setTimeout(() => Haptics.selectionAsync(), 35);
    setTimeout(() => Haptics.selectionAsync(), 70);
  };

  const handleValueChange = (raw: number) => {
    const i = Math.round(raw);
    if (i === lastIdxRef.current) return;
    lastIdxRef.current = i;
    rollBurst();
    const v = optionsRef.current[i]?.value;
    if (v != null) onChangeRef.current(v);
  };

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={[styles.bigLabel, { color: colors.text }]}>
          {options[idx].label}
        </Text>
        {options[idx].hint ? (
          <Text style={[styles.hint, { color: colors.secondary }]}>
            {options[idx].hint}
          </Text>
        ) : null}
      </View>

      <Slider
        // Inset by half a column so each stop locks centred above its word.
        style={[styles.slider, { marginHorizontal: `${50 / n}%` }]}
        minimumValue={0}
        maximumValue={n - 1}
        step={1}
        value={idx}
        onValueChange={handleValueChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.separator}
        thumbTintColor={colors.isDark ? "#fff" : undefined}
        tapToSeek
      />

      <View style={styles.bottom}>
        <View style={styles.ticks}>
          {options.map((o, i) => (
            <View key={o.value} style={styles.tickCol}>
              <Text
                style={[
                  styles.tick,
                  {
                    color: i === idx ? colors.accent : colors.secondary,
                    fontWeight: i === idx ? "700" : "500",
                  },
                ]}
              >
                {o.short ?? o.label}
              </Text>
              {o.critter ? (
                <View style={styles.critter}>
                  <ActivityCritter
                    kind={o.critter}
                    active={i === idx}
                    idleColor={colors.secondary}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Extend slightly past the body padding so the track is a touch wider.
    // The slider's percentage inset scales with this, keeping thumb stops
    // aligned over the tick labels.
    marginHorizontal: -12,
  },
  // A heavier lower half lifts the slider up to compensate for the heading
  // block above the body, so the track sits on the screen's vertical centre.
  top: {
    flex: 5,
    justifyContent: "flex-end",
  },
  bottom: {
    flex: 7,
  },
  bigLabel: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.6,
    textAlign: "center",
    marginBottom: 6,
  },
  hint: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: 28,
    lineHeight: 20,
  },
  slider: {
    alignSelf: "stretch",
    height: 40,
  },
  ticks: {
    flexDirection: "row",
    marginTop: 6,
  },
  tickCol: {
    flex: 1,
    alignItems: "center",
  },
  tick: {
    fontSize: 12,
    textAlign: "center",
  },
  critter: {
    marginTop: 8,
    height: 28,
    justifyContent: "center",
  },
});
