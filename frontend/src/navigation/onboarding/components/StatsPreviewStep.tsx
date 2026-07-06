import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";

export function StatsPreviewStep({ onNext, onBack, progress }: StepProps) {
  const colors = useOnboardingColors();

  const tiles = [
    { label: "Workouts", value: "0", hint: "Your count climbs from day one" },
    { label: "Day streak", value: "0", hint: "Keep it alive" },
    { label: "Volume", value: "0 lb", hint: "Total weight moved" },
    { label: "PRs", value: "0", hint: "Personal records to chase" },
  ];

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="This is your dashboard"
      subheading="Every workout you log fills it in. Here's what you'll be growing."
      onContinue={onNext}
      continueLabel="Let's go"
    >
      <View style={styles.body}>
        <View style={styles.grid}>
          {tiles.map((t) => (
            <View
              key={t.label}
              style={[
                styles.tile,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.tileValue, { color: colors.text }]}>
                {t.value}
              </Text>
              <Text style={[styles.tileLabel, { color: colors.text }]}>
                {t.label}
              </Text>
              <Text style={[styles.tileHint, { color: colors.secondary }]}>
                {t.hint}
              </Text>
            </View>
          ))}
        </View>
        <View
          style={[
            styles.bar,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.barTitle, { color: colors.text }]}>
            Weekly activity
          </Text>
          <View style={styles.barRow}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <View key={i} style={styles.barCol}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: 8 + ((i * 13) % 44),
                      backgroundColor: colors.accent,
                      opacity: 0.25,
                    },
                  ]}
                />
                <Text style={[styles.barDay, { color: colors.secondary }]}>
                  {d}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 24,
    gap: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    width: "47%",
    flexGrow: 1,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
  },
  tileValue: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  tileHint: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  bar: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 18,
  },
  barTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 14,
  },
  barRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 60,
  },
  barCol: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  barFill: {
    width: 18,
    borderRadius: 6,
  },
  barDay: {
    fontSize: 12,
    fontWeight: "500",
  },
});
