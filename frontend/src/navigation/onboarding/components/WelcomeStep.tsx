import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  useColorScheme,
} from "react-native";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { GOOGLE_LOGO_URI } from "../socialAuthUris";
import { StepProps } from "../stepProps";

const gearLogo = require("../../../../assets/GearLogo288.png");
const gearLogoInverse = require("../../../../assets/GearLogoInverse288.png");

export function WelcomeStep({ onNext, onGoogleSignIn }: StepProps) {
  const isDark = useColorScheme() === "dark";
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  return (
    <View style={shared.screen}>
      <View style={styles.heroSection}>
        <View style={styles.brandRow}>
          <Image
            source={isDark ? gearLogo : gearLogoInverse}
            style={styles.logoImage}
            resizeMode="contain"
            fadeDuration={0}
          />
        </View>
        {/* Placeholder hero — replaced later with photography of people
            working out. */}
        <View
          style={[
            styles.heroPlaceholder,
            {
              borderColor: colors.dashedBorder,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text style={styles.heroEmoji}>🏋️</Text>
          <Text
            style={[styles.heroPlaceholderText, { color: colors.secondary }]}
          >
            Workout imagery coming soon
          </Text>
        </View>
        <Text style={[shared.heading, styles.centeredHeading]}>
          Train hard.{"\n"}Track everything.
        </Text>
        <Text style={[shared.subheading, styles.centeredSub]}>
          Gear builds your plan, logs your lifts, and keeps you accountable.
        </Text>
      </View>
      <View style={[shared.footer, styles.footerGap]}>
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [
            shared.continueBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={shared.continueBtnText}>Get Started</Text>
        </Pressable>
        <View style={styles.dividerRow}>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
          <Text style={[styles.dividerText, { color: colors.secondary }]}>
            or sign in with
          </Text>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
        </View>
        <View style={styles.iconRow}>
          <Pressable
            onPress={onGoogleSignIn}
            style={[styles.iconBtn, { backgroundColor: colors.accent }]}
          >
            <Image source={{ uri: GOOGLE_LOGO_URI }} style={styles.iconLogo} />
          </Pressable>
        </View>
        <Text style={[styles.terms, { color: colors.secondary }]}>
          By continuing you agree to our{" "}
          <Text style={[styles.termsLink, { color: colors.text }]}>Terms</Text>{" "}
          and{" "}
          <Text style={[styles.termsLink, { color: colors.text }]}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  brandRow: {
    marginBottom: 18,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  heroPlaceholder: {
    alignSelf: "stretch",
    height: 180,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
    gap: 6,
  },
  heroEmoji: {
    fontSize: 40,
  },
  heroPlaceholderText: {
    fontSize: 13,
    fontWeight: "500",
  },
  centeredHeading: {
    fontSize: 36,
    letterSpacing: -1.2,
    lineHeight: 40,
    marginBottom: 12,
    textAlign: "center",
  },
  centeredSub: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 280,
    textAlign: "center",
    marginBottom: 0,
  },
  footerGap: {
    gap: 12,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 13,
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLogo: {
    width: 22,
    height: 22,
  },
  terms: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  termsLink: {
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.75,
  },
});
