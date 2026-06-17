import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { GOAL_OPTIONS } from "../intakeOptions";
import { FitnessGoal } from "../types";

export function GoalStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const selected = draft.goals ?? [];
  const toggle = (value: FitnessGoal) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    updateDraft({ goals: next });
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="What are your goals?"
      subheading="Pick all that apply — this shapes the plan we build for you."
      onContinue={onNext}
      continueDisabled={!draft.goals?.length}
    >
      <OptionCardList
        minimal
        multi
        options={GOAL_OPTIONS}
        selected={draft.goals}
        onSelect={toggle}
      />
    </StepScaffold>
  );
}
