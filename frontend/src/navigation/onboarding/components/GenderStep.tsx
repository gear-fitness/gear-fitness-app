import React from "react";
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import { Gender } from "../types";
import { OnboardingTopBar } from "./OnboardingTopBar";

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
  return (
    <View style={styles.screen}>
      <OnboardingTopBar progress={0.2} onBack={onBack} />
      <View style={styles.body}>
        <Text style={styles.heading}>What's your gender?</Text>
        <Text style={styles.subheading}>
          This helps us calculate accurate calorie and macro goals.
        </Text>
        <View style={styles.list}>
          {GENDERS.map((g) => {
            const isSelected = selected === g.value;
            return (
              <Pressable
                key={g.value}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => onSelect(g.value)}
              >
                <View style={styles.cardText}>
                  <Text
                    style={[styles.cardName, isSelected && styles.cardNameSelected]}
                  >
                    {g.label}
                  </Text>
                  {g.hint && (
                    <Text
                      style={[
                        styles.cardHint,
                        isSelected && styles.cardHintSelected,
                      ]}
                    >
                      {g.hint}
                    </Text>
                  )}
                </View>
                {isSelected && (
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity onPress={onContinue} activeOpacity={0.8} style={styles.continueBtn}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  heading: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0D0D0D",
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 5,
  },
  subheading: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 21,
    marginBottom: 24,
  },
  list: {
    flex: 1,
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    minHeight: 72,
  },
  cardSelected: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  cardText: { flex: 1 },
  cardName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0D0D0D",
    letterSpacing: -0.2,
  },
  cardNameSelected: { color: "#fff" },
  cardHint: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 1,
  },
  cardHintSelected: { color: "rgba(255,255,255,0.5)" },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D0D0D",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 10,
  },
  continueBtn: {
    height: 60,
    borderRadius: 999,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
});
