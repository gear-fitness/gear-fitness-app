import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { routinesForSplit } from "../routineTemplates";
import { RoutineSplit } from "../types";

const SPLIT_OPTIONS: {
  value: RoutineSplit;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    value: "auto",
    label: "Not sure yet",
    hint: "We'll pick based on your schedule",
    icon: "wand.and.stars",
  },
  {
    value: "full_body",
    label: "Full Body",
    hint: "Train everything each session",
    icon: "figure.arms.open",
  },
  {
    value: "upper_lower",
    label: "Upper / Lower",
    hint: "Alternate upper and lower days",
    icon: "arrow.up.and.down",
  },
  {
    value: "push_pull_legs",
    label: "Push / Pull / Legs",
    hint: "Split by movement pattern",
    icon: "arrow.left.arrow.right",
  },
  {
    value: "anterior_posterior",
    label: "Anterior / Posterior",
    hint: "Front-body and back-body days",
    icon: "figure.2",
  },
];

export function RoutineIntroStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const select = (split: RoutineSplit) => {
    updateDraft({
      split,
      routines: routinesForSplit(split, {
        daysPerWeek: draft.daysPerWeek,
        trainingDays: draft.trainingDays,
        equipment: draft.equipment,
      }),
    });
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="What's your split?"
      subheading="How do you want to structure your training week? You can fine-tune everything next."
      onContinue={onNext}
      continueLabel="Review my routines"
      continueDisabled={!draft.split}
    >
      <OptionCardList
        minimal
        options={SPLIT_OPTIONS}
        selected={draft.split}
        onSelect={select}
      />
    </StepScaffold>
  );
}
