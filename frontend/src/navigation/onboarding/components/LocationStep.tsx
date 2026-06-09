import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { LOCATION_OPTIONS } from "../intakeOptions";
import { TrainingLocation } from "../types";

export function LocationStep({
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
      heading="Where will you train?"
      subheading="So your plan only uses equipment you can reach."
      onContinue={onNext}
      continueDisabled={!draft.trainingLocation}
    >
      <OptionCardList
        options={LOCATION_OPTIONS}
        selected={draft.trainingLocation}
        onSelect={(trainingLocation: TrainingLocation) =>
          updateDraft({ trainingLocation })
        }
      />
    </StepScaffold>
  );
}
