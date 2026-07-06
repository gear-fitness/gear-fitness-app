import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { PlanSummary } from "./PlanSummary";

export function PlanRevealStep({ draft, onNext, onBack, progress }: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

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

        <PlanSummary draft={draft} />
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
  pressed: {
    opacity: 0.75,
  },
});
