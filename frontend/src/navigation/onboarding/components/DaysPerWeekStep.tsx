import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";

const CHOICES = [1, 2, 3, 4, 5, 6, 7];

export function DaysPerWeekStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const selected = draft.daysPerWeek;

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="How many days a week?"
      subheading="Be honest. Consistency beats ambition."
      onContinue={onNext}
      continueDisabled={!selected}
    >
      <View style={styles.wrap}>
        <View style={styles.pillRow}>
          {CHOICES.map((n) => {
            const active = selected === n;
            return (
              <Pressable
                key={n}
                onPress={() => updateDraft({ daysPerWeek: n })}
                style={[
                  styles.pill,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                  },
                  active && {
                    backgroundColor: colors.accent,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillNum,
                    { color: active ? colors.accentText : colors.text },
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 40,
  },
  pillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 7,
  },
  pill: {
    flex: 1,
    aspectRatio: 0.62,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pillNum: {
    fontSize: 22,
    fontWeight: "700",
  },
});
