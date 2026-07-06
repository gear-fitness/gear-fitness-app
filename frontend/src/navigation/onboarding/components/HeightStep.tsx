import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { HeightPickerInline } from "./MetricPickers";
import { Height } from "../types";

export function HeightStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const [height, setHeight] = useState<Height | undefined>(draft.height);

  const handleContinue = () => {
    if (height) updateDraft({ height });
    onNext();
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      onContinue={handleContinue}
      continueDisabled={!height}
    >
      <View style={styles.center}>
        <Text style={[shared.heading, styles.heading]}>
          What's your height?
        </Text>
        <HeightPickerInline
          initial={draft.height}
          onChange={setHeight}
          colors={colors}
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
  heading: {
    marginBottom: 12,
  },
});
