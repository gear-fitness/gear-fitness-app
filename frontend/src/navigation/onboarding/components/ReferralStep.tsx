import React from "react";
import { View, Text, StyleSheet, Share } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";

export function ReferralStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();

  const handleInvite = async () => {
    try {
      await Share.share({
        message:
          "I'm starting my plan on Gear — come train with me and let's keep each other accountable. https://gearfitness.app",
      });
      updateDraft({ referralSent: true });
    } catch {
      // User dismissed the share sheet — no-op.
    }
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="Bring your accountability circle"
      subheading="People who train with friends are far more likely to stick with it. Invite 3 friends to unlock your free trial."
      onContinue={handleInvite}
      continueLabel="Invite friends"
      footerExtra={
        <Text
          onPress={onNext}
          style={[styles.skip, { color: colors.secondary }]}
        >
          {draft.referralSent ? "Continue" : "Maybe later"}
        </Text>
      }
    >
      <View style={styles.center}>
        <Text style={styles.emoji}>🤝</Text>
        <View style={styles.avatarRow}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.screenBg,
                  marginLeft: i === 0 ? 0 : -16,
                },
              ]}
            >
              <Text style={styles.avatarPlus}>+</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.caption, { color: colors.secondary }]}>
          Your crew keeps you showing up.
        </Text>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
    gap: 18,
  },
  emoji: {
    fontSize: 56,
  },
  avatarRow: {
    flexDirection: "row",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlus: {
    fontSize: 24,
    color: "#999",
    fontWeight: "300",
  },
  caption: {
    fontSize: 15,
    fontWeight: "500",
  },
  skip: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 8,
  },
});
