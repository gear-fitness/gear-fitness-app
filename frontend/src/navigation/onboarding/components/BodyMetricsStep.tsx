import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import {
  MetricCard,
  HeightPickerSheet,
  WeightPickerSheet,
  formatHeight,
  formatWeight,
} from "./MetricPickers";

export function BodyMetricsStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const [htSheet, setHtSheet] = useState(false);
  const [wtSheet, setWtSheet] = useState(false);

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="Your measurements"
      subheading="We use these to size your starting weights and track change."
      onContinue={onNext}
      continueDisabled={!draft.height || !draft.weight}
    >
      <View style={styles.cards}>
        <MetricCard
          label="Height"
          value={formatHeight(draft.height)}
          onPress={() => setHtSheet(true)}
          colors={colors}
        />
        <MetricCard
          label="Weight"
          value={formatWeight(draft.weight)}
          onPress={() => setWtSheet(true)}
          colors={colors}
        />
      </View>

      <HeightPickerSheet
        visible={htSheet}
        initial={draft.height}
        onClose={() => setHtSheet(false)}
        onDone={(h) => {
          updateDraft({ height: h });
          setHtSheet(false);
        }}
      />
      <WeightPickerSheet
        visible={wtSheet}
        title="Your weight"
        initial={draft.weight}
        onClose={() => setWtSheet(false)}
        onDone={(w) => {
          updateDraft({ weight: w });
          setWtSheet(false);
        }}
      />
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  cards: {
    flex: 1,
    gap: 10,
  },
});
