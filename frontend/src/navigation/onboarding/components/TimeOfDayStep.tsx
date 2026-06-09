import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { TIME_OF_DAY_OPTIONS } from "../intakeOptions";
import { TimeOfDay } from "../types";

export function TimeOfDayStep({
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
      heading="When do you like to train?"
      subheading="We'll time your reminders to match."
      onContinue={onNext}
      continueDisabled={!draft.timeOfDay}
    >
      <OptionCardList
        options={TIME_OF_DAY_OPTIONS}
        selected={draft.timeOfDay}
        onSelect={(timeOfDay: TimeOfDay) => updateDraft({ timeOfDay })}
      />
    </StepScaffold>
  );
}
