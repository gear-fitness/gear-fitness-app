import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { SESSION_LENGTH_OPTIONS } from "../intakeOptions";
import { SessionLength } from "../types";

export function SessionLengthStep({
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
      heading="How long is each session?"
      subheading="We'll fit the right amount of work into your window."
      onContinue={onNext}
      continueDisabled={!draft.sessionLength}
    >
      <OptionCardList
        options={SESSION_LENGTH_OPTIONS}
        selected={draft.sessionLength}
        onSelect={(sessionLength: SessionLength) =>
          updateDraft({ sessionLength })
        }
      />
    </StepScaffold>
  );
}
