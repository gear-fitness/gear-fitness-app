import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { Gender } from "../types";

const GENDER_OPTIONS: { value: Gender; label: string; hint?: string }[] = [
  { value: "male", label: "Male", hint: "He / Him" },
  { value: "female", label: "Female", hint: "She / Her" },
  { value: "non_binary", label: "Non-binary", hint: "They / Them" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function GenderStep({
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
      heading="What's your gender?"
      subheading="Used to calibrate your strength and body-stat baselines."
      onContinue={onNext}
      continueDisabled={!draft.gender}
    >
      <OptionCardList
        options={GENDER_OPTIONS}
        selected={draft.gender}
        onSelect={(gender: Gender) => updateDraft({ gender })}
      />
    </StepScaffold>
  );
}
