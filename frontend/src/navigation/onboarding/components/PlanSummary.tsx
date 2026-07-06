import React, { useMemo } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { useOnboardingColors } from "./useOnboardingColors";
import { ProjectionChart } from "./ProjectionChart";
import { recommendRoutines } from "../routineTemplates";
import { computeProjection, formatMonthYear } from "../projection";
import { formatWeight } from "../units";
import { DraftRoutine, OnboardingDraft } from "../types";

/** The user's generated plan — projection chart + routines list. Shared by
 *  the plan reveal screen and the account screen so they stay in sync.
 *  Pass showProjection={false} to render the routines card only. */
export function PlanSummary({
  draft,
  showProjection = true,
}: {
  draft: OnboardingDraft;
  showProjection?: boolean;
}) {
  const colors = useOnboardingColors();
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

  return (
    <>
      {showProjection && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Projected progress
          </Text>
          {projection ? (
            <ProjectionChart
              width={width - 48 - 36}
              startLabel="Today"
              endLabel={formatMonthYear(projection.targetDate)}
              startValue={formatWeight(draft.weight)}
              endValue={formatWeight(draft.goalWeight)}
              direction={projection.direction}
            />
          ) : (
            // No weight delta (e.g. maintain) — show a strength-trend curve.
            <ProjectionChart
              width={width - 48 - 36}
              startLabel="Today"
              endLabel="12 weeks"
              startValue="Start"
              endValue="Stronger"
              direction="up"
            />
          )}
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
    </>
  );
}

const styles = StyleSheet.create({
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
});
