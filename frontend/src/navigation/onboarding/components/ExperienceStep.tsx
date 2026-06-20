import React from "react";
import { View, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { ChoiceSlider, SliderOption } from "./ChoiceSlider";
import { EXPERIENCE_OPTIONS } from "../intakeOptions";
import { ExperienceLevel } from "../types";

const SHORT_LABELS: Record<ExperienceLevel, string> = {
  none: "None",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const SLIDER_OPTIONS: SliderOption<ExperienceLevel>[] = EXPERIENCE_OPTIONS.map(
  (o) => ({
    value: o.value,
    label: o.label,
    short: SHORT_LABELS[o.value],
    hint: o.hint,
  }),
);

export function ExperienceStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="How much lifting experience do you have?"
      subheading="We'll match the complexity of your plan to your level."
      onContinue={onNext}
      continueDisabled={!draft.experience}
    >
      <View style={styles.center}>
        <ChoiceSlider
          options={SLIDER_OPTIONS}
          value={draft.experience}
          defaultValue="beginner"
          onChange={(experience: ExperienceLevel) =>
            updateDraft({ experience })
          }
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
