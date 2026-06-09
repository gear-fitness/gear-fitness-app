import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { EXPERIENCE_OPTIONS } from "../intakeOptions";
import { ExperienceLevel } from "../types";

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
      <OptionCardList
        options={EXPERIENCE_OPTIONS}
        selected={draft.experience}
        onSelect={(experience: ExperienceLevel) => updateDraft({ experience })}
      />
    </StepScaffold>
  );
}
