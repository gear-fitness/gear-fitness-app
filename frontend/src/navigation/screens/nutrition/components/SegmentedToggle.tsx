import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemeColors } from "../../../../hooks/useThemeColors";

/**
 * An iOS-style segmented control: a rounded track with a thumb that slides
 * smoothly between segments. The thumb position is a spring-driven Animated
 * value, matching the app's physical spring feel (damping 22, stiffness 220).
 * Fully controlled — the parent owns the active index.
 */
export function SegmentedToggle({
  segments,
  activeIndex,
  onChange,
}: {
  segments: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  const t = useThemeColors();
  const [trackWidth, setTrackWidth] = useState(0);
  const anim = useRef(new Animated.Value(activeIndex)).current;

  // Slide the thumb to the active segment whenever it changes.
  useEffect(() => {
    Animated.spring(anim, {
      toValue: activeIndex,
      useNativeDriver: true,
      damping: 22,
      stiffness: 220,
    }).start();
  }, [activeIndex, anim]);

  const inset = 3;
  const innerWidth = Math.max(trackWidth - inset * 2, 0);
  const segWidth = segments.length > 0 ? innerWidth / segments.length : 0;

  // Map segment index -> pixel offset for the thumb. interpolate needs at least
  // two stops, so fall back to a static offset for a lone segment.
  const translateX =
    segments.length > 1
      ? anim.interpolate({
          inputRange: segments.map((_, i) => i),
          outputRange: segments.map((_, i) => i * segWidth),
        })
      : 0;

  const onLayout = (e: LayoutChangeEvent) =>
    setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={[styles.track, { backgroundColor: t.unitToggleBg }]}
      onLayout={onLayout}
    >
      {segWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: segWidth,
              backgroundColor: t.unitBtnActiveBg,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
      {segments.map((label, i) => {
        const active = activeIndex === i;
        return (
          <TouchableOpacity
            key={label}
            activeOpacity={0.8}
            style={styles.segment}
            onPress={() => onChange(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: active ? t.text : t.secondary },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
  },
  thumb: {
    position: "absolute",
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 9,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  label: { fontSize: 14, fontWeight: "600" },
});
