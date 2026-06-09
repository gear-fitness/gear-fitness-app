import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { useOnboardingColors } from "./useOnboardingColors";
import { GOAL_SUCCESS_STAT_PCT } from "../intakeOptions";
import { StepScaffold } from "./StepScaffold";

export function SocialProofStep({ onNext, onBack, progress }: StepProps) {
  const colors = useOnboardingColors();

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="You're in good company"
      onContinue={onNext}
      continueLabel="Keep going"
    >
      <View style={styles.center}>
        <Text style={[styles.bigStat, { color: colors.text }]}>
          {GOAL_SUCCESS_STAT_PCT}%
        </Text>
        <Text style={[styles.statCaption, { color: colors.text }]}>
          of Gear users meet their goals within the first 3 months of installing
          Gear.
        </Text>
        <View
          style={[
            styles.quoteCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={styles.stars}>★★★★★</Text>
          <Text style={[styles.quote, { color: colors.text }]}>
            “Logging every set kept me honest. Twelve weeks in and every lift is
            up.”
          </Text>
          <Text style={[styles.quoteName, { color: colors.secondary }]}>
            — Gear member since 2025
          </Text>
        </View>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 24,
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
    marginTop: 8,
    marginBottom: 28,
  },
  quoteCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignSelf: "stretch",
    gap: 8,
  },
  stars: {
    fontSize: 15,
    color: "#F3B503",
    letterSpacing: 2,
  },
  quote: {
    fontSize: 15,
    lineHeight: 22,
  },
  quoteName: {
    fontSize: 13,
  },
});
