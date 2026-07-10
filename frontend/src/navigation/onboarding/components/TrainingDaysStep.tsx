import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "../../../components/Text";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import { TRAINING_DAY_OPTIONS } from "../intakeOptions";
import { TrainingDay } from "../types";

export function TrainingDaysStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const selected = draft.trainingDays ?? [];

  const toggle = (value: TrainingDay) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    updateDraft({ trainingDays: next, daysPerWeek: next.length });
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="Which days work for you?"
      subheading="Pick the days you'll train. Consistency beats ambition."
      onContinue={onNext}
      continueDisabled={selected.length === 0}
    >
      <View style={styles.list}>
        {TRAINING_DAY_OPTIONS.map((d) => {
          const active = selected.includes(d.value);
          return (
            <Pressable
              key={d.value}
              onPress={() => toggle(d.value)}
              style={[
                styles.row,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
                active && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: active ? colors.accentText : colors.text },
                ]}
              >
                {d.label}
              </Text>
              {active && (
                <View
                  style={[styles.check, { backgroundColor: colors.accentText }]}
                >
                  <Text style={[styles.checkMark, { color: colors.accent }]}>
                    ✓
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    gap: 8,
  },
  row: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  dayText: {
    fontSize: 16,
    fontWeight: "600",
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 12,
    fontWeight: "700",
  },
});
