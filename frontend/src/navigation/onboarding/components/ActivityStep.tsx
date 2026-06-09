import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { ACTIVITY_OPTIONS } from "../intakeOptions";
import { ActivityLevel } from "../types";

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
      <OptionCardList
        options={ACTIVITY_OPTIONS}
        selected={draft.activityLevel}
        onSelect={(activityLevel: ActivityLevel) =>
          updateDraft({ activityLevel })
        }
      />
    </StepScaffold>
  );
}
