import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import { WeightRuler } from "./RulerPicker";
import { weightToLbs } from "../units";
import { Weight } from "../types";

export function GoalWeightStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const [goal, setGoal] = useState<Weight | undefined>(draft.goalWeight);

  // Live caption reflecting the goal relative to current weight.
  const current = weightToLbs(draft.weight);
  const goalLbs = weightToLbs(goal);
  let caption: string | undefined;
  if (current != null && goalLbs != null) {
    const delta = goalLbs - current;
    caption =
      delta <= -2 ? "Lose weight" : delta >= 2 ? "Gain weight" : "Maintain";
  }

  const handleContinue = () => {
    if (goal) updateDraft({ goalWeight: goal });
    onNext();
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="What's your goal weight?"
      onContinue={handleContinue}
      continueDisabled={!goal}
    >
      <View style={styles.center}>
        <WeightRuler
          initial={draft.goalWeight ?? draft.weight}
          caption={caption}
          onChange={setGoal}
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
