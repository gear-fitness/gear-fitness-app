import React, { useMemo } from "react";
import { View, StyleSheet, Share, Pressable } from "react-native";
import { Text } from "../../../components/Text";
import { SymbolView } from "expo-symbols";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";

export function ReferralStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const username = draft.profile?.username;
  const code = username ? `@${username}` : null;

  const handleInvite = async () => {
    try {
      await Share.share({
        message: code
          ? `I'm starting my plan on Gear — come train with me. Find me at ${code} and let's keep each other accountable. https://gearfitness.app`
          : "I'm starting my plan on Gear — come train with me and let's keep each other accountable. https://gearfitness.app",
      });
      updateDraft({ referralSent: true });
    } catch {
      // User dismissed the share sheet — no-op.
    }
  };

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <View style={styles.body}>
        <Text style={[styles.eyebrow, { color: colors.secondary }]}>
          0 OF 3 FRIENDS JOINED
        </Text>
        <Text style={[styles.heading, { color: colors.text }]}>
          Share with{"\n"}3 friends.
        </Text>

        <View style={styles.slots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.slot,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SymbolView
                name="ticket.fill"
                size={44}
                tintColor={colors.secondary}
                resizeMode="scaleAspectFit"
                style={styles.ticket}
              />
            </View>
          ))}
        </View>

        <Text style={[styles.sub, { color: colors.secondary }]}>
          Lifting with friends is more fun. Share with 3 friends for a 1-week
          free Gear Plus trial.
        </Text>

        {code && (
          <>
            <View style={[styles.codeBox, { borderColor: colors.border }]}>
              <Text style={[styles.codeText, { color: colors.text }]}>
                {code}
              </Text>
            </View>
            <Text style={[styles.codeSub, { color: colors.secondary }]}>
              Friends can find and follow you with this.
            </Text>
          </>
        )}
      </View>

      <View style={shared.footer}>
        <Pressable
          onPress={handleInvite}
          style={({ pressed }) => [
            shared.continueBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={shared.continueBtnText}>Share with friends</Text>
        </Pressable>
        <Pressable onPress={onNext}>
          <Text style={[styles.skip, { color: colors.secondary }]}>
            {draft.referralSent ? "Continue" : "Maybe later"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 38,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
  slots: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  slot: {
    width: 96,
    height: 96,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  ticket: {
    width: 44,
    height: 44,
  },
  codeBox: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  codeText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  codeSub: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 280,
  },
  skip: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.75,
  },
});
