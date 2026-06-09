import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingColors } from "./useOnboardingColors";

/** TESTING ONLY — floating skip rendered on every onboarding screen so
 *  testers can step through the flow. Anchored bottom-right so it stays
 *  within thumb reach. Remove before release; real skip affordances live
 *  inside the individual steps. */
export function TesterSkipButton({ onSkip }: { onSkip: () => void }) {
  const colors = useOnboardingColors();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onSkip}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => [
        styles.pill,
        { bottom: insets.bottom + 8, backgroundColor: colors.unitToggleBg },
        pressed && styles.pressed,
      ]}
      accessibilityLabel="Skip (testing)"
    >
      <Text style={[styles.text, { color: colors.secondary }]}>Skip ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 10,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.6,
  },
});
