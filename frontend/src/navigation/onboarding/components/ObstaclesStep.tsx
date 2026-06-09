import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { OBSTACLE_OPTIONS } from "../intakeOptions";
import { Obstacle } from "../types";

export function ObstaclesStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const selected = draft.obstacles ?? [];

  const toggle = (value: Obstacle) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    updateDraft({ obstacles: next });
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="What's held you back before?"
      subheading="Pick all that apply — we'll design around them."
      onContinue={onNext}
      continueDisabled={selected.length === 0}
      scroll
    >
      <OptionCardList
        options={OBSTACLE_OPTIONS}
        selected={selected}
        onSelect={toggle}
        multi
        fill={false}
      />
    </StepScaffold>
  );
}
