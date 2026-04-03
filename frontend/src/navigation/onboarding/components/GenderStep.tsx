import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Gender } from "../types";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";

const GENDERS: { value: Gender; label: string; hint?: string }[] = [
  { value: "male", label: "Male", hint: "He / Him" },
  { value: "female", label: "Female", hint: "She / Her" },
  { value: "non_binary", label: "Non-binary", hint: "They / Them" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

interface GenderStepProps {
  selected?: Gender;
  onSelect: (g: Gender) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function GenderStep({
  selected,
  onSelect,
  onBack,
  onContinue,
}: GenderStepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={0.2} onBack={onBack} />
      <View style={shared.body}>
        <Text style={shared.heading}>What's your gender?</Text>
        <Text style={shared.subheading}>
          This helps us calculate accurate calorie and macro goals.
        </Text>
        <View style={styles.list}>
          {GENDERS.map((g) => {
            const isSelected = selected === g.value;
            return (
              <Pressable
                key={g.value}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                  },
                  isSelected && {
                    backgroundColor: colors.accent,
                    borderColor: colors.accent,
                  },
                ]}
                onPress={() => onSelect(g.value)}
              >
                <View style={styles.cardText}>
                  <Text
                    style={[
                      styles.cardName,
                      { color: isSelected ? colors.accentText : colors.text },
                    ]}
                  >
                    {g.label}
                  </Text>
                  {g.hint && (
                    <Text
                      style={[
                        styles.cardHint,
                        {
                          color: isSelected
                            ? colors.isDark
                              ? "rgba(0,0,0,0.5)"
                              : "rgba(255,255,255,0.6)"
                            : colors.secondary,
                        },
                      ]}
                    >
                      {g.hint}
                    </Text>
                  )}
                </View>
                {isSelected && (
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: colors.accentText },
                    ]}
                  >
                    <Text style={[styles.checkmark, { color: colors.accent }]}>
                      ✓
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={shared.footer}>
        <Pressable
          onPress={onContinue}
          disabled={!selected}
          style={[shared.continueBtn, !selected && shared.continueBtnDisabled]}
        >
          <Text style={shared.continueBtnText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    minHeight: 72,
  },
  cardText: { flex: 1 },
  cardName: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  cardHint: {
    fontSize: 13,
    marginTop: 1,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontSize: 13,
    fontWeight: "700",
  },
});
