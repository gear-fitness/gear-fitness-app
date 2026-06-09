import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";

const CHOICES = [2, 3, 4, 5, 6];

const SUBTITLE: Record<number, string> = {
  2: "Two focused full-body days",
  3: "A balanced push / pull / legs split",
  4: "Upper / lower, twice each",
  5: "A dedicated day per muscle group",
  6: "Maximum volume — for the committed",
};

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
      subheading="Be honest — consistency beats ambition."
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
        {selected ? (
          <Text style={[styles.caption, { color: colors.secondary }]}>
            {SUBTITLE[selected]}
          </Text>
        ) : null}
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
    gap: 10,
  },
  pill: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pillNum: {
    fontSize: 28,
    fontWeight: "700",
  },
  caption: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 24,
  },
});
