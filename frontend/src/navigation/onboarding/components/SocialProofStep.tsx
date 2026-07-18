import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { Text } from "../../../components/Text";
import { StepProps } from "../stepProps";
import { useOnboardingColors } from "./useOnboardingColors";
import { GOAL_SUCCESS_STAT_PCT } from "../intakeOptions";
import { StepScaffold } from "./StepScaffold";

// Reviewer photo shown in the testimonial card. Swap the asset to change it.
const REVIEW_AVATAR = require("../../../../assets/review-avatar.jpg");

export function SocialProofStep({ onNext, onBack, progress }: StepProps) {
  const colors = useOnboardingColors();

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="You're in good company"
      headingOffset={24}
      onContinue={onNext}
      continueLabel="Keep going"
    >
      <View style={styles.center}>
        <View style={styles.statWrap}>
          <Text style={[styles.bigStat, { color: colors.text }]}>
            {GOAL_SUCCESS_STAT_PCT}%
          </Text>
        </View>
        <View style={styles.bottomBlock}>
          <Text style={[styles.statCaption, { color: colors.text }]}>
            of Gear users meet their goals within the first 3 months of
            installing Gear.
          </Text>
          <View
            style={[
              styles.quoteCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.quoteHeader}>
              <Text style={[styles.stars, { color: colors.text }]}>★★★★★</Text>
              <View
                style={[styles.avatar, { backgroundColor: colors.surface }]}
              >
                <Image source={REVIEW_AVATAR} style={styles.avatarImage} />
              </View>
            </View>
            <Text style={[styles.quote, { color: colors.text }]}>
              “Logging every set kept me honest. Twelve weeks in and every lift
              is up.”
            </Text>
            <Text style={[styles.quoteName, { color: colors.secondary }]}>
              — Gear member since 2025
            </Text>
          </View>
        </View>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 24,
  },
  statWrap: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBlock: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: 12,
    marginBottom: 40,
  },
  bigStat: {
    fontSize: 96,
    fontWeight: "800",
    letterSpacing: -4,
    lineHeight: 100,
  },
  statCaption: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
    marginBottom: 16,
  },
  quoteCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignSelf: "stretch",
    gap: 8,
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stars: {
    fontSize: 15,
    letterSpacing: 2,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  quote: {
    fontSize: 15,
    lineHeight: 22,
  },
  quoteName: {
    fontSize: 13,
  },
});
