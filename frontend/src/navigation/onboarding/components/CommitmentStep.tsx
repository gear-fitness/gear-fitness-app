import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";

export function CommitmentStep({ onNext, onBack, progress }: StepProps) {
  const colors = useOnboardingColors();

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="Small sessions, stacked up"
      onContinue={onNext}
      continueLabel="Let's build it"
    >
      <View style={styles.center}>
        <Text style={styles.emoji}>📈</Text>
        <Text style={[styles.lead, { color: colors.text }]}>
          You don't need perfect. You need repeatable.
        </Text>
        <Text style={[styles.body, { color: colors.secondary }]}>
          Gear keeps your plan short enough to finish and tracks every set so
          the progress is impossible to ignore. Show up, log it, watch it climb.
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
    paddingHorizontal: 8,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 24,
  },
  lead: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 320,
  },
});
