import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import { recommendRoutines } from "../routineTemplates";

export function RoutineIntroStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();

  const recommended = useMemo(
    () =>
      recommendRoutines({
        daysPerWeek: draft.daysPerWeek,
        trainingDays: draft.trainingDays,
        equipment: draft.equipment,
      }),
    [draft.daysPerWeek, draft.trainingDays, draft.equipment],
  );

  const splitName =
    recommended.length <= 2
      ? "Full Body"
      : recommended.length === 3
        ? "Push / Pull / Legs"
        : recommended.length === 4
          ? "Upper / Lower"
          : `${recommended.length}-Day Split`;

  const handleContinue = () => {
    // Seed the builder with the recommendation the first time through.
    if (!draft.routines) updateDraft({ routines: recommended });
    onNext();
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="Your starter routines"
      subheading="Built from your schedule and equipment. You'll tweak them next, then they save to your profile."
      onContinue={handleContinue}
      continueLabel="Review my routines"
    >
      <View style={styles.center}>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={styles.badgeEmoji}>🗓️</Text>
          <Text style={[styles.split, { color: colors.text }]}>
            {splitName}
          </Text>
          <Text style={[styles.meta, { color: colors.secondary }]}>
            {recommended.length} routines ·{" "}
            {draft.daysPerWeek ?? recommended.length} days / week
          </Text>
        </View>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  badge: {
    alignSelf: "stretch",
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    paddingVertical: 36,
    gap: 6,
  },
  badgeEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  split: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  meta: {
    fontSize: 15,
    fontWeight: "500",
  },
});
