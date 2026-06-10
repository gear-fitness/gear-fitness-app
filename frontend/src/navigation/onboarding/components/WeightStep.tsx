import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import { WeightRuler } from "./RulerPicker";
import { Weight } from "../types";

export function WeightStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const [weight, setWeight] = useState<Weight | undefined>(draft.weight);

  const handleContinue = () => {
    if (weight) updateDraft({ weight });
    onNext();
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="How much do you weigh?"
      onContinue={handleContinue}
      continueDisabled={!weight}
    >
      <View style={styles.center}>
        <WeightRuler
          initial={draft.weight}
          onChange={setWeight}
          colors={colors}
        />
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
  },
});
