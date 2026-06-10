import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import { ProjectionChart } from "./ProjectionChart";

export function CommitmentStep({ onNext, onBack, progress }: StepProps) {
  const colors = useOnboardingColors();
  const { width } = useWindowDimensions();
  const chartWidth = width - 80;

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="Small sessions, stacked up"
      onContinue={onNext}
      continueLabel="Let's build it"
    >
      <View style={styles.center}>
        <View style={[styles.chart, { width: chartWidth }]}>
          <ProjectionChart
            width={chartWidth}
            height={180}
            startLabel="Today"
            endLabel="12 weeks"
            startValue="Start"
            endValue="Stronger"
            direction="up"
          />
        </View>
        <Text style={[styles.lead, { color: colors.text }]}>
          You don't need perfect. You need repeatable.
        </Text>
        <Text style={[styles.body, { color: colors.secondary }]}>
          Gear keeps you on track. It nudges you to your next session, logs
          every set, and shows your progress so it's easy to stay consistent.
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
  chart: {
    alignSelf: "center",
    marginBottom: 20,
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
