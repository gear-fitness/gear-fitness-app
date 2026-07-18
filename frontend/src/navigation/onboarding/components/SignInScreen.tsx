import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Platform,
  useColorScheme,
} from "react-native";
import { Text } from "../../../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingCloseButton } from "../../../components/FloatingCloseButton";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { GOOGLE_LOGO_URI, appleBrandLogoUri } from "../socialAuthUris";
import { openTerms, openPrivacy } from "../../../constants/legal";

const gearLogoDark = require("../../../../assets/GearLogo.png");
const gearLogoLight = require("../../../../assets/GearLogoInverse.png");

interface SignInScreenProps {
  onBack: () => void;
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  onSignUp: () => void;
  isSigningIn: boolean;
}

/**
 * Dedicated "sign in to an existing account" screen — replaces the native
 * provider-choice Alert that used to fire from WelcomeStep. Presented as a
 * full-screen overlay by OnboardingScreen.
 */
export function SignInScreen({
  onBack,
  onGoogleSignIn,
  onAppleSignIn,
  onSignUp,
  isSigningIn,
}: SignInScreenProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
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
    onGoogleSignIn();
  };
  const handleApple = () => {
    setPending("apple");
    onAppleSignIn();
  };

  return (
    <View style={shared.screen}>
      <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <FloatingCloseButton
          inline
          icon="close"
          accessibilityLabel="Close"
          onPress={onBack}
        />
      </View>

      <View style={styles.body}>
        <Image
          source={isDark ? gearLogoDark : gearLogoLight}
          style={styles.appLogo}
          resizeMode="contain"
        />
        <Text style={[styles.heading, { color: colors.text }]}>
          Sign in to{"\n"}hop on Gear
        </Text>

        <View style={styles.buttons}>
          {Platform.OS === "ios" && (
            <Pressable
              onPress={handleApple}
              disabled={isSigningIn}
              style={({ pressed }) => [
                shared.continueBtn,
                styles.authBtn,
                { backgroundColor: appleBg },
                pressed && styles.pressed,
                isSigningIn &&
                  pending !== "apple" &&
                  shared.continueBtnDisabled,
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
                  {pending === "apple" ? "Signing in…" : "Sign in with Apple"}
                </Text>
              </View>
            </Pressable>
          )}
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
                {pending === "google" ? "Signing in…" : "Sign in with Google"}
              </Text>
            </View>
          </Pressable>
        </View>

        <Pressable
          onPress={onSignUp}
          disabled={isSigningIn}
          hitSlop={8}
          style={styles.signUpRow}
        >
          <Text style={[styles.signUpText, { color: colors.secondary }]}>
            Don't have an account?{" "}
            <Text style={[styles.signUpLink, { color: colors.text }]}>
              Sign up here
            </Text>
          </Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.terms, { color: colors.secondary }]}>
          By continuing you agree to our{" "}
          <Text
            style={[styles.termsLink, { color: colors.text }]}
            onPress={openTerms}
          >
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text
            style={[styles.termsLink, { color: colors.text }]}
            onPress={openPrivacy}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  appLogo: {
    width: 120,
    height: 120,
    marginTop: 24,
    marginBottom: 0,
  },
  heading: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.6,
    lineHeight: 38,
    textAlign: "center",
    marginBottom: 40,
  },
  buttons: {
    alignSelf: "stretch",
    gap: 12,
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
  signUpRow: {
    marginTop: 20,
    alignItems: "center",
  },
  signUpText: {
    fontSize: 14,
  },
  signUpLink: {
    fontWeight: "700",
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
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 44,
    paddingTop: 10,
  },
  terms: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  pressed: {
    opacity: 0.75,
  },
});
