import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingCloseButton } from "../../../components/FloatingCloseButton";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";

interface AccountExistsScreenProps {
  provider: "google" | "apple";
  onBack: () => void;
  onSignIn: () => void;
  isSigningIn: boolean;
}

/**
 * Dedicated "you already have an account" screen — replaces the native
 * ACCOUNT_ALREADY_EXISTS Alert that used to fire when a user tried to sign up
 * with a provider that's already linked to an account. Presented as a
 * full-screen overlay by OnboardingScreen.
 */
export function AccountExistsScreen({
  provider,
  onBack,
  onSignIn,
  isSigningIn,
}: AccountExistsScreenProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const providerLabel = provider === "google" ? "Google" : "Apple";

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
      <View style={[shared.body, styles.bodyTop]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.cardBg }]}>
          <SymbolView
            name="person.crop.circle.badge.checkmark"
            size={42}
            tintColor={colors.accent}
            resizeMode="scaleAspectFit"
          />
        </View>
        <Text style={shared.heading}>You already have an account</Text>
        <Text style={shared.subheading}>
          An account already exists for this {providerLabel} account. Sign in to
          continue where you left off.
        </Text>
      </View>
      <View style={shared.footer}>
        <Pressable
          onPress={onSignIn}
          disabled={isSigningIn}
          style={({ pressed }) => [
            shared.continueBtn,
            pressed && styles.pressed,
            isSigningIn && shared.continueBtnDisabled,
          ]}
        >
          <Text style={shared.continueBtnText}>
            {isSigningIn ? "Signing in…" : `Sign in with ${providerLabel}`}
          </Text>
        </Pressable>
        <Pressable
          onPress={onBack}
          disabled={isSigningIn}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.secondary }]}>
            Go back
          </Text>
        </Pressable>
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
  bodyTop: {
    paddingTop: 12,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  secondaryBtn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.75,
  },
});
