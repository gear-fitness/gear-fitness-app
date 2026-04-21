import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Gender } from "../types";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { GenderCardList } from "./GenderCardList";

interface GenderStepProps {
  selected?: Gender;
  onSelect: (g: Gender) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function GenderStep({
  selected,
  onSelect,
  onBack,
  onContinue,
}: GenderStepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={0.2} onBack={onBack} />
      <View style={shared.body}>
        <Text style={shared.heading}>What's your gender?</Text>
        <Text style={shared.subheading}>
          This helps us calculate accurate calorie and macro goals.
        </Text>
        <GenderCardList
          selected={selected}
          onSelect={onSelect}
          colors={colors}
        />
      </View>
      <View style={shared.footer}>
        <Pressable
          onPress={onContinue}
          disabled={!selected}
          style={[shared.continueBtn, !selected && shared.continueBtnDisabled]}
        >
          <Text style={shared.continueBtnText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}
