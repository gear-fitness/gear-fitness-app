import React from "react";
import { View, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { ChoiceSlider, SliderOption } from "./ChoiceSlider";
import { BatteryScene } from "./BatteryScene";
import { SESSION_LENGTH_OPTIONS } from "../intakeOptions";
import { SessionLength } from "../types";

const SLIDER_OPTIONS: SliderOption<SessionLength>[] = SESSION_LENGTH_OPTIONS.map(
  (o) => ({
    value: o.value,
    label: o.label,
    short: `${o.value}m`,
    hint: o.hint,
  }),
);

const ORDER = SLIDER_OPTIONS.map((o) => o.value);

export function SessionLengthStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const idx = Math.max(0, ORDER.indexOf(draft.sessionLength ?? 45));

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="How long is each session?"
      subheading="We'll fit the right amount of work into your window."
      onContinue={onNext}
      continueDisabled={!draft.sessionLength}
    >
      <View style={styles.body}>
        <BatteryScene index={idx} />
        <View style={styles.sliderWrap}>
          <ChoiceSlider
            options={SLIDER_OPTIONS}
            value={draft.sessionLength}
            defaultValue={45}
            onChange={(sessionLength: SessionLength) =>
              updateDraft({ sessionLength })
            }
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
