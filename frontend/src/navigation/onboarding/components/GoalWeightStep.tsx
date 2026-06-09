import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import { MetricCard, WeightPickerSheet, formatWeight } from "./MetricPickers";
import { weightToLbs } from "../units";

export function GoalWeightStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const [sheet, setSheet] = useState(false);

  const current = weightToLbs(draft.weight);
  const goal = weightToLbs(draft.goalWeight);
  const delta = current != null && goal != null ? goal - current : null;

  let deltaText: string | null = null;
  if (delta != null && Math.abs(delta) >= 2) {
    deltaText =
      delta < 0
        ? `That's ${Math.abs(delta)} lbs to lose`
        : `That's ${Math.abs(delta)} lbs to gain`;
  } else if (delta != null) {
    deltaText = "Right around maintenance";
  }

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="What's your goal weight?"
      subheading="Your target — we'll map a realistic path to it."
      onContinue={onNext}
      continueDisabled={!draft.goalWeight}
    >
      <View style={styles.cards}>
        <MetricCard
          label="Goal weight"
          value={formatWeight(draft.goalWeight)}
          sub={deltaText ?? undefined}
          onPress={() => setSheet(true)}
          colors={colors}
        />
        {current != null && (
          <Text style={[styles.currentLine, { color: colors.secondary }]}>
            Current: {formatWeight(draft.weight)}
          </Text>
        )}
      </View>

      <WeightPickerSheet
        visible={sheet}
        title="Goal weight"
        initial={draft.goalWeight ?? draft.weight}
        onClose={() => setSheet(false)}
        onDone={(w) => {
          updateDraft({ goalWeight: w });
          setSheet(false);
        }}
      />
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  cards: {
    flex: 1,
    gap: 14,
  },
  currentLine: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});
