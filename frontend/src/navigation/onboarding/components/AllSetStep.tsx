import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { GlassPrimaryButton } from "./GlassPrimaryButton";

interface AllSetStepProps {
  onSignIn: () => void;
  onBack: () => void;
}

export function AllSetStep({ onSignIn, onBack }: AllSetStepProps) {
  return (
    <View style={styles.screen}>
      <OnboardingTopBar progress={1} onBack={onBack} />
      <View style={styles.heroSection}>
        <View style={styles.iconBox}>
          <Text style={styles.checkEmoji}>✓</Text>
        </View>
        <Text style={styles.heading}>You're all set.</Text>
        <Text style={styles.subheading}>
          Save your profile by signing in — it only takes a second.
        </Text>
      </View>
      <View style={styles.footer}>
        <GlassPrimaryButton label="Sign in with Google" onPress={onSignIn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  checkEmoji: {
    fontSize: 44,
    color: "#fff",
    fontWeight: "700",
  },
  heading: {
    fontSize: 34,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -1,
    marginBottom: 10,
    textAlign: "center",
  },
  subheading: {
    fontSize: 15,
    color: "#8E8E93",
    lineHeight: 24,
    maxWidth: 240,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 0,
    gap: 10,
  },
});
