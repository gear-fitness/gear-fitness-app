import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { INJURY_OPTIONS } from "../intakeOptions";
import { Injury } from "../types";

export function InjuriesStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const selected = draft.injuries ?? [];

  const toggle = (value: Injury) => {
    // "No limitations" is exclusive with every specific area.
    if (value === "none") {
      updateDraft({ injuries: selected.includes("none") ? [] : ["none"] });
      return;
    }
    const withoutNone = selected.filter((v) => v !== "none");
    const next = withoutNone.includes(value)
      ? withoutNone.filter((v) => v !== value)
      : [...withoutNone, value];
    updateDraft({ injuries: next });
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="Any injuries or limitations?"
      subheading="We'll steer your plan around anything you flag."
      onContinue={onNext}
      continueDisabled={selected.length === 0}
      scroll
    >
      <OptionCardList
        options={INJURY_OPTIONS}
        selected={selected}
        onSelect={toggle}
        multi
        fill={false}
      />
    </StepScaffold>
  );
}
