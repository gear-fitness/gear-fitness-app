import React from "react";
import { View, StyleSheet } from "react-native";
import { BackButton } from "../../../components/BackButton";
import { useOnboardingColors } from "./useOnboardingColors";

interface OnboardingTopBarProps {
  progress: number; // 0..1
  onBack: () => void;
}

export function OnboardingTopBar({ progress, onBack }: OnboardingTopBarProps) {
  const colors = useOnboardingColors();
  return (
    <View style={styles.topbar}>
      <BackButton onPress={onBack} color={colors.text} size={26} />
      <View style={[styles.trackWrap, { backgroundColor: colors.trackBg }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 8,
  },
  trackWrap: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 99,
  },
});
