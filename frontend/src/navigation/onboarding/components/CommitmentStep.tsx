import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../../../components/Text";
import { SymbolView } from "expo-symbols";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";

export function CommitmentStep({ onNext, onBack, progress }: StepProps) {
  const colors = useOnboardingColors();

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="Small sessions, stacked up"
      onContinue={onNext}
      continueLabel="Let's build it"
    >
      <View style={styles.center}>
        <View style={styles.wreathRow}>
          <SymbolView
            name="laurel.leading"
            size={260}
            tintColor={colors.text}
            resizeMode="scaleAspectFit"
            style={styles.laurel}
          />
          <View style={styles.statBlock}>
            <Text
              style={[styles.eyebrow, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Harvard Health
            </Text>
            <Text style={[styles.statNumber, { color: colors.text }]}>150</Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>
              {"minutes of exercise a week"}
            </Text>
          </View>
          <SymbolView
            name="laurel.trailing"
            size={260}
            tintColor={colors.text}
            resizeMode="scaleAspectFit"
            style={styles.laurel}
          />
        </View>

        <View style={[styles.rule, { backgroundColor: colors.separator }]} />

        <Text style={[styles.body, { color: colors.text }]}>
          Harvard Health recommends about 150 minutes of exercise a week to stay
          healthy. Gear makes that achievable.
        </Text>
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
    paddingHorizontal: 12,
  },
  eyebrow: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  wreathRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  laurel: {
    width: 78,
    height: 220,
  },
  statBlock: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    paddingHorizontal: 4,
  },
  statNumber: {
    fontSize: 84,
    fontWeight: "800",
    letterSpacing: -3,
    lineHeight: 86,
  },
  statLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 150,
  },
  rule: {
    height: 1,
    width: 40,
    marginVertical: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 320,
  },
});
