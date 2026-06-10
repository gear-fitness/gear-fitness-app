import React from "react";
import { View, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { ChoiceSlider, SliderOption } from "./ChoiceSlider";
import { SkyScene } from "./SkyScene";
import { TIME_OF_DAY_OPTIONS } from "../intakeOptions";
import { TimeOfDay } from "../types";

const SHORT: Record<TimeOfDay, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
  varies: "Anytime",
};

const SLIDER_OPTIONS: SliderOption<TimeOfDay>[] = TIME_OF_DAY_OPTIONS.map(
  (o) => ({
    value: o.value,
    label: o.label,
    short: SHORT[o.value],
    hint: o.hint,
  }),
);

const ORDER = SLIDER_OPTIONS.map((o) => o.value);

export function TimeOfDayStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const idx = Math.max(0, ORDER.indexOf(draft.timeOfDay ?? "midday"));

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="When do you like to train?"
      subheading="We'll time your reminders to match."
      onContinue={onNext}
      continueDisabled={!draft.timeOfDay}
    >
      <View style={styles.body}>
        <SkyScene index={idx} />
        <View style={styles.sliderWrap}>
          <ChoiceSlider
            options={SLIDER_OPTIONS}
            value={draft.timeOfDay}
            defaultValue="midday"
            onChange={(timeOfDay: TimeOfDay) => updateDraft({ timeOfDay })}
          />
        </View>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  sliderWrap: {
    flex: 1,
  },
});
