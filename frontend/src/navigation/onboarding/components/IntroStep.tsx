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
import { GOOGLE_LOGO_URI, appleBrandLogoUri } from "../socialAuthUris";

const gearLogo = require("../../../../assets/GearLogo288.png");
const gearLogoInverse = require("../../../../assets/GearLogoInverse288.png");

interface IntroStepProps {
  onGetStarted: () => void;
  onGoogleSignIn?: () => void;
}

export function IntroStep({ onGetStarted, onGoogleSignIn }: IntroStepProps) {
  const isDark = useColorScheme() === "dark";
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  return (
    <View style={shared.screen}>
      <View style={styles.heroSection}>
        <View style={[styles.logoBox, { backgroundColor: colors.screenBg }]}>
          <Image
            source={isDark ? gearLogo : gearLogoInverse}
            style={styles.logoImage}
            resizeMode="contain"
            fadeDuration={0}
          />
        </View>
        <Text style={[shared.heading, styles.centeredHeading]}>
          Ready to hop{"\n"}on Gear?
        </Text>
        <Text style={[shared.subheading, styles.centeredSub]}>
          Your fitness journey starts here. Let's set up your profile in under a
          minute.
        </Text>
      </View>
      <View style={[shared.footer, styles.footerGap]}>
        <Pressable
          onPress={onGetStarted}
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
          <Pressable
            style={[styles.iconBtn, { backgroundColor: colors.accent }]}
          >
            <Image
              source={{ uri: appleBrandLogoUri(colors.isDark) }}
              style={styles.appleLogo}
              resizeMode="contain"
            />
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
    paddingHorizontal: 36,
  },
  logoBox: {
    width: 144,
    height: 144,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    overflow: "hidden",
  },
  logoImage: {
    width: 144,
    height: 144,
  },
  centeredHeading: {
    fontSize: 36,
    letterSpacing: -1.2,
    lineHeight: 40,
    marginBottom: 14,
    textAlign: "center",
  },
  centeredSub: {
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 260,
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
  appleLogo: {
    width: 26,
    height: 26,
    marginTop: -3,
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
