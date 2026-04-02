import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { OnboardingTopBar } from "./OnboardingTopBar";

interface AllSetStepProps {
  onSignIn: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function AllSetStep({ onSignIn, onBack, isLoading = false }: AllSetStepProps) {
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
        <TouchableOpacity
          onPress={onSignIn}
          activeOpacity={0.8}
          disabled={isLoading}
          style={styles.signInBtn}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signInBtnText}>Sign in with Google</Text>
          )}
        </TouchableOpacity>
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
  signInBtn: {
    height: 60,
    borderRadius: 999,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  signInBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
});
