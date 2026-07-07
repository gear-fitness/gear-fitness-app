import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { OptionCardList } from "./OptionCardList";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { Gender } from "../types";

const GENDER_OPTIONS: {
  value: Gender;
  label: string;
  emoji?: string;
  icon?: string;
}[] = [
  { value: "male", label: "Male", emoji: "♂" },
  { value: "female", label: "Female", emoji: "♀" },
  { value: "other", label: "Other", icon: "square.grid.2x2.fill" },
  {
    value: "prefer_not_to_say",
    label: "Prefer not to say",
    icon: "hand.raised.fill",
  },
];

export function GenderStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      onContinue={onNext}
      continueDisabled={!draft.gender}
    >
      <View style={styles.center}>
        <Text style={shared.heading}>Choose your sex</Text>
        <Text style={shared.subheading}>
          This helps personalize your experience.
        </Text>
        <OptionCardList
          minimal
          options={GENDER_OPTIONS}
          selected={draft.gender}
          onSelect={(gender: Gender) => updateDraft({ gender })}
        />
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
  },
});
