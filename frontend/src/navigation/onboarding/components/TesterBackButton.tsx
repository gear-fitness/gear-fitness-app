import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Text } from "../../../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingColors } from "./useOnboardingColors";

/** TESTING ONLY — floating back rendered on every onboarding screen so
 *  testers can step backwards, including on screens without a top-bar back
 *  (e.g. the plan loading screen). Anchored bottom-left, mirroring the skip
 *  button. Remove before release together with TesterSkipButton. */
export function TesterBackButton({ onBack }: { onBack: () => void }) {
  const colors = useOnboardingColors();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onBack}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => [
        styles.pill,
        {
          bottom: insets.bottom + 8,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && styles.pressed,
      ]}
      accessibilityLabel="Back (testing)"
    >
      <Text style={[styles.text, { color: colors.secondary }]}>‹ Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 1,
    zIndex: 9999,
    elevation: 24,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.6,
  },
});
