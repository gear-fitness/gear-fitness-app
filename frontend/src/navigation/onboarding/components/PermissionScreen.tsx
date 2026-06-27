import React, { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";

interface PermissionScreenProps {
  progress: number;
  onBack: () => void;
  /** Emoji-tile hero (used when `hero` is not provided). */
  emoji?: string;
  accentColor?: string;
  /** Custom hero graphic, rendered in place of the emoji tile. */
  hero?: React.ReactNode;
  /** Place the hero above (default) or below the title/description block. */
  heroPosition?: "above" | "below";
  title: string;
  description?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  onSkip?: () => void;
  busy?: boolean;
  /** Hide the primary + skip footer actions entirely. */
  hideActions?: boolean;
}

/** Full-screen single-permission prompt: a hero icon, title, description,
 *  a primary "enable" action, and a skip link. Shared by the Apple Health
 *  and Notifications onboarding steps. */
export function PermissionScreen({
  progress,
  onBack,
  emoji,
  accentColor,
  hero,
  heroPosition = "above",
  title,
  description,
  primaryLabel,
  onPrimary,
  onSkip,
  busy = false,
  hideActions = false,
}: PermissionScreenProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const heroNode = hero ?? (
    <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>
      <Text style={styles.emoji}>{emoji}</Text>
    </View>
  );

  const textBlock = (
    <>
      <Text style={[shared.heading, styles.title]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: colors.secondary }]}>
          {description}
        </Text>
      ) : null}
    </>
  );

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <View style={shared.body}>
        <View style={[styles.hero, hideActions && styles.heroNoActions]}>
          {heroPosition === "below" ? (
            <>
              {textBlock}
              <View style={styles.heroBelow}>{heroNode}</View>
            </>
          ) : (
            <>
              <View style={styles.heroAbove}>{heroNode}</View>
              {textBlock}
            </>
          )}
        </View>
      </View>
      {!hideActions && (
        <View style={shared.footer}>
          <Pressable
            onPress={busy ? undefined : onPrimary}
            disabled={busy}
            style={({ pressed }) => [
              shared.continueBtn,
              busy && shared.continueBtnDisabled,
              pressed && !busy && styles.pressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={shared.continueBtnText}>{primaryLabel}</Text>
            )}
          </Pressable>
          {onSkip ? (
            <Pressable onPress={onSkip} style={styles.skip}>
              <Text style={[styles.skipText, { color: colors.secondary }]}>
                Skip for now
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  heroNoActions: {
    paddingBottom: 220,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  heroAbove: {
    marginBottom: 28,
  },
  heroBelow: {
    marginTop: 32,
  },
  emoji: {
    fontSize: 46,
  },
  title: {
    textAlign: "center",
  },
  desc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
    marginTop: 8,
  },
  skip: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.75,
  },
});
