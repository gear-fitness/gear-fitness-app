import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";

interface AllSetStepProps {
  onSignIn: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function AllSetStep({ onSignIn, onBack, isLoading = false }: AllSetStepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={1} onBack={onBack} />
      <View style={styles.heroSection}>
        <View style={[styles.iconBox, { backgroundColor: colors.accent }]}>
          <Text style={[styles.checkEmoji, { color: colors.accentText }]}>✓</Text>
        </View>
        <Text style={[shared.heading, styles.centeredHeading]}>You're all set.</Text>
        <Text style={[shared.subheading, styles.centeredSub]}>
          Save your profile by signing up — it only takes a second.
        </Text>
      </View>
      <View style={shared.footer}>
        <Pressable
          onPress={onSignIn}
          disabled={isLoading}
          style={({ pressed }) => [shared.continueBtn, pressed && styles.pressed, isLoading && shared.continueBtnDisabled]}
        >
          <View style={styles.btnContent}>
            <Image
              source={{ uri: "https://www.gstatic.com/marketing-cms/assets/images/d5/dc/cfe9ce8b4425b410b49b7f2dd3f3/g.webp=s96-fcrop64=1,00000000ffffffff-rw" }}
              style={styles.socialLogo}
            />
            <Text style={shared.continueBtnText}>Sign up with Google</Text>
          </View>
        </Pressable>
        <Pressable
          style={({ pressed }) => [shared.continueBtn, pressed && styles.pressed]}
        >
          <View style={styles.btnContent}>
            <Image
              source={{ uri: colors.isDark
                ? "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1280px-Apple_logo_black.svg.png"
                : "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Apple_logo_white.svg/1280px-Apple_logo_white.svg.png?_=20220821122232"
              }}
              style={styles.appleLogo}
              resizeMode="contain"
            />
            <Text style={shared.continueBtnText}>Sign up with Apple</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  checkEmoji: {
    fontSize: 44,
    fontWeight: "700",
  },
  centeredHeading: {
    fontSize: 34,
    letterSpacing: -1,
    marginBottom: 10,
    textAlign: "center",
  },
  centeredSub: {
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 240,
    textAlign: "center",
    marginBottom: 0,
  },
  pressed: {
    opacity: 0.75,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  socialLogo: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  appleLogo: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
});
