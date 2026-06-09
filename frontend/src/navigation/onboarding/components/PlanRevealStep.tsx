import React, { useMemo } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { ScrollView, Pressable } from "react-native";
import { ProjectionChart } from "./ProjectionChart";
import { recommendRoutines } from "../routineTemplates";
import { computeProjection, formatMonthYear } from "../projection";
import { formatWeight } from "../units";
import { GOAL_LABELS } from "../intakeOptions";
import { DraftRoutine } from "../types";

export function PlanRevealStep({ draft, onNext, onBack, progress }: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const { width } = useWindowDimensions();

  const routines: DraftRoutine[] = useMemo(
    () =>
      draft.routines ??
      recommendRoutines({
        daysPerWeek: draft.daysPerWeek,
        trainingDays: draft.trainingDays,
        equipment: draft.equipment,
      }),
    [draft.routines, draft.daysPerWeek, draft.trainingDays, draft.equipment],
  );

  const projection = computeProjection(draft);
  const goalLabel = draft.goal ? GOAL_LABELS[draft.goal] : "your goal";

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <ScrollView
        style={shared.body}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: colors.secondary }]}>
          YOUR PERSONALIZED PLAN
        </Text>
        <Text style={shared.heading}>
          {draft.profile?.name
            ? `${draft.profile.name.split(" ")[0]}, here's your plan`
            : "Here's your plan"}
        </Text>
        <Text style={shared.subheading}>
          Built to help you {goalLabel} — and it's all editable.
        </Text>

        {projection && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Projected progress
            </Text>
            <ProjectionChart
              width={width - 48 - 36}
              startLabel="Today"
              endLabel={formatMonthYear(projection.targetDate)}
              startValue={formatWeight(draft.weight)}
              endValue={formatWeight(draft.goalWeight)}
              direction={projection.direction}
            />
          </View>
        )}

        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Your routines
          </Text>
          {routines.map((r, i) => (
            <View
              key={i}
              style={[
                styles.routineRow,
                i < routines.length - 1 && {
                  borderBottomColor: colors.separator,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={styles.routineInfo}>
                <Text style={[styles.routineName, { color: colors.text }]}>
                  {r.name}
                </Text>
                <Text style={[styles.routineMeta, { color: colors.secondary }]}>
                  {r.exercises.length} exercises
                  {r.scheduledDays.length > 0
                    ? ` · ${r.scheduledDays.join(", ")}`
                    : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={shared.footer}>
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [
            shared.continueBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={shared.continueBtnText}>Looks great</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    marginTop: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  routineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 16,
    fontWeight: "700",
  },
  routineMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
