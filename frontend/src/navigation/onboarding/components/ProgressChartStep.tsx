import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Text } from "../../../components/Text";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import { ProjectionChart } from "./ProjectionChart";
import { formatWeight } from "../units";
import { computeProjection, formatMonthYear } from "../projection";
import { GOAL_LABELS } from "../intakeOptions";

export function ProgressChartStep({
  draft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const { width } = useWindowDimensions();
  const chartWidth = width - 48;

  const projection = computeProjection(draft);
  // The short flow skips the goals step; without a goal the generic
  // "reach your goal" label would read "your goal to reach your goal".
  const subheading = draft.goals?.length
    ? `A realistic pace toward your goal to ${GOAL_LABELS[draft.goals[0]]}.`
    : "A realistic pace toward your goal.";

  // Headline: mirror the user's own numbers back, CalAI-style.
  let headline = "Here's where you're headed";
  if (projection) {
    const verb = projection.direction === "down" ? "Lose" : "Gain";
    headline = `${verb} ${Math.abs(projection.deltaLbs)} lbs by ${formatMonthYear(
      projection.targetDate,
    )}`;
  }

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading={headline}
      subheading={subheading}
      onContinue={onNext}
      continueLabel="I'm in"
    >
      <View style={styles.body}>
        {projection ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <ProjectionChart
              width={chartWidth - 40}
              startLabel="Today"
              endLabel={formatMonthYear(projection.targetDate)}
              startValue={formatWeight(draft.weight)}
              endValue={formatWeight(draft.goalWeight)}
              direction={projection.direction}
            />
            <Text style={[styles.note, { color: colors.secondary }]}>
              Based on a sustainable{" "}
              {projection.direction === "down" ? "1–1.5 lbs" : "0.5 lb"} per
              week. Most progress comes from the first few consistent weeks.
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <ProjectionChart
              width={chartWidth - 40}
              startLabel="Today"
              endLabel="12 weeks"
              startValue="Start"
              endValue="Stronger"
              direction="up"
            />
            <Text style={[styles.note, { color: colors.secondary }]}>
              Strength and consistency compound. Your trend line climbs the more
              you show up.
            </Text>
          </View>
        )}
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 24,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1.5,
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 18,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
