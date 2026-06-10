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
  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="What's your main goal?"
      subheading="This shapes the plan we build for you."
      onContinue={onNext}
      continueDisabled={!draft.goal}
    >
      <OptionCardList
        minimal
        options={GOAL_OPTIONS}
        selected={draft.goal}
        onSelect={(goal: FitnessGoal) => updateDraft({ goal })}
      />
    </StepScaffold>
  );
}
