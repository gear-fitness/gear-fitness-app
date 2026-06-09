import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { GOOGLE_LOGO_URI } from "../socialAuthUris";

const BENEFITS = [
  "Save your plan and routines",
  "Track every workout and PR",
  "Sync across all your devices",
];

export function AccountStep({
  onGoogleSignUp,
  isSigningIn,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <View style={shared.body}>
        <Text style={shared.heading}>Save your progress</Text>
        <Text style={shared.subheading}>
          Create your free account so your plan is waiting for you.
        </Text>
        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefitRow}>
              <View style={[styles.tick, { backgroundColor: colors.accent }]}>
                <Text style={[styles.tickMark, { color: colors.accentText }]}>
                  ✓
                </Text>
              </View>
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {b}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={shared.footer}>
        <Pressable
          onPress={onGoogleSignUp}
          disabled={isSigningIn}
          style={({ pressed }) => [
            shared.continueBtn,
            pressed && styles.pressed,
            isSigningIn && shared.continueBtnDisabled,
          ]}
        >
          <View style={styles.btnContent}>
            <Image source={{ uri: GOOGLE_LOGO_URI }} style={styles.logo} />
            <Text style={shared.continueBtnText}>
              {isSigningIn ? "Signing up…" : "Sign up with Google"}
            </Text>
          </View>
        </Pressable>
        <Text style={[styles.terms, { color: colors.secondary }]}>
          By signing up you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  benefits: {
    gap: 16,
    marginTop: 8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  tickMark: {
    fontSize: 13,
    fontWeight: "700",
  },
  benefitText: {
    fontSize: 16,
    fontWeight: "500",
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  terms: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
  },
});
