import React from "react";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { EQUIPMENT_OPTIONS } from "../intakeOptions";
import { EquipmentOption } from "../types";

export function EquipmentStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const selected = draft.equipment ?? [];

  const toggle = (value: EquipmentOption) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    updateDraft({ equipment: next });
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="What can you train with?"
      subheading="Select everything you have access to."
      onContinue={onNext}
      continueDisabled={selected.length === 0}
    >
      <OptionCardList
        minimal
        options={EQUIPMENT_OPTIONS}
        selected={selected}
        onSelect={toggle}
        multi
      />
    </StepScaffold>
  );
}
