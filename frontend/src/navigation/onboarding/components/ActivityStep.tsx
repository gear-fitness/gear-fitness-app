import React from "react";
import { View, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { ChoiceSlider, SliderOption } from "./ChoiceSlider";
import { ACTIVITY_OPTIONS } from "../intakeOptions";
import { ActivityLevel } from "../types";

const SHORT_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  very_active: "Very active",
};

const CRITTERS: Record<ActivityLevel, SliderOption<ActivityLevel>["critter"]> = {
  sedentary: "couch",
  light: "turtle",
  moderate: "bunny",
  very_active: "bird",
};

const SLIDER_OPTIONS: SliderOption<ActivityLevel>[] = ACTIVITY_OPTIONS.map(
  (o) => ({
    value: o.value,
    label: o.label,
    short: SHORT_LABELS[o.value],
    hint: o.hint,
    critter: CRITTERS[o.value],
  }),
);

export function ActivityStep({
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
      heading="How active are you day to day?"
      subheading="Outside of training — this sets your baseline."
      onContinue={onNext}
      continueDisabled={!draft.activityLevel}
    >
      <View style={styles.center}>
        <ChoiceSlider
          options={SLIDER_OPTIONS}
          value={draft.activityLevel}
          defaultValue="light"
          onChange={(activityLevel: ActivityLevel) =>
            updateDraft({ activityLevel })
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
