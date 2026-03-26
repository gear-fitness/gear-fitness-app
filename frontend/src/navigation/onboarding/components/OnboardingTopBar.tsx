import React from "react";
import { View, StyleSheet } from "react-native";
import { BackButton } from "../../../components/BackButton";

interface OnboardingTopBarProps {
  progress: number; // 0..1
  onBack: () => void;
}

export function OnboardingTopBar({ progress, onBack }: OnboardingTopBarProps) {
  return (
    <View style={styles.topbar}>
      <BackButton onPress={onBack} color="#0D0D0D" size={26} />
      <View style={styles.trackWrap}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
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
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 99,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#0D0D0D",
    borderRadius: 99,
  },
});
