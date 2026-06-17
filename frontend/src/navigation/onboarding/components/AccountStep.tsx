import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Platform,
  useColorScheme,
} from "react-native";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { PlanSummary } from "./PlanSummary";
import { GOOGLE_LOGO_URI, appleBrandLogoUri } from "../socialAuthUris";

const BENEFITS = [
  "Save your plan and routines",
  "Track every workout and PR",
  "Sync across all your devices",
  "Follow friends and stay accountable",
  "See your strength trends over time",
];

export function AccountStep({
  draft,
  onGoogleSignUp,
  onAppleSignUp,
  isSigningIn,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const isDark = useColorScheme() === "dark";
  // Standard Apple button: dark in light mode, light in dark mode.
  const appleBg = isDark ? "#fff" : "#000";
  const appleFg = isDark ? "#000" : "#fff";

  // Track which provider the user tapped so only that button shows the
  // loading state (isSigningIn alone is shared by both buttons).
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  useEffect(() => {
    if (!isSigningIn) setPending(null);
  }, [isSigningIn]);

  const handleGoogle = () => {
    setPending("google");
    onGoogleSignUp();
  };
  const handleApple = () => {
    setPending("apple");
    onAppleSignUp();
  };

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <ScrollView
        style={shared.body}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={shared.heading}>Don't lose your progress</Text>
        <Text style={shared.subheading}>
          Create your free account so your plan doesn't get lost.
        </Text>

        <PlanSummary draft={draft} showProjection={false} />

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
      </ScrollView>
      <View style={shared.footer}>
        <Pressable
          onPress={handleGoogle}
          disabled={isSigningIn}
          style={({ pressed }) => [
            shared.continueBtn,
            styles.authBtn,
            pressed && styles.pressed,
            isSigningIn && pending !== "google" && shared.continueBtnDisabled,
          ]}
        >
          <View style={styles.btnContent}>
            <Image source={{ uri: GOOGLE_LOGO_URI }} style={styles.logo} />
            <Text style={[shared.continueBtnText, styles.authBtnText]}>
              {pending === "google" ? "Signing up…" : "Sign up with Google"}
            </Text>
          </View>
        </Pressable>
        {Platform.OS === "ios" && (
          <Pressable
            onPress={handleApple}
            disabled={isSigningIn}
            style={({ pressed }) => [
              shared.continueBtn,
              styles.authBtn,
              { backgroundColor: appleBg },
              pressed && styles.pressed,
              isSigningIn && pending !== "apple" && shared.continueBtnDisabled,
            ]}
          >
            <View style={styles.btnContent}>
              <Image
                source={{ uri: appleBrandLogoUri(isDark) }}
                style={styles.appleLogo}
              />
              <Text
                style={[
                  shared.continueBtnText,
                  styles.authBtnText,
                  { color: appleFg },
                ]}
              >
                {pending === "apple" ? "Signing up…" : "Sign up with Apple"}
              </Text>
            </View>
          </Pressable>
        )}
        <Text style={[styles.terms, { color: colors.secondary }]}>
          By signing up you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  benefits: {
    gap: 16,
    marginTop: 24,
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
  authBtn: {
    height: 52,
  },
  authBtnText: {
    fontSize: 16,
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
  appleLogo: {
    width: 18,
    height: 22,
    marginRight: 8,
    resizeMode: "contain",
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
