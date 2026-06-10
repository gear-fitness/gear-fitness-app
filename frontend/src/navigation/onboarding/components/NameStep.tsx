import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { FloatingKeyboardDismiss } from "../../../components/FloatingKeyboardDismiss";

export function NameStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [name, setName] = useState(draft.profile?.name ?? "");
  const canContinue = name.trim().length > 0;

  const handleNameChange = (val: string) => {
    setName(val);
    // Persist to the shared profile so it pre-fills "Create your profile".
    updateDraft({ profile: { ...draft.profile, name: val } });
  };

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <View style={styles.center}>
        <Text style={[shared.heading, styles.heading]}>What's your name?</Text>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.handle}
            value={name}
            onChangeText={handleNameChange}
            autoFocus
            autoComplete="name"
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>
      </View>
      <View style={shared.footer}>
        <Pressable
          onPress={onNext}
          disabled={!canContinue}
          style={({ pressed }) => [
            shared.continueBtn,
            !canContinue && shared.continueBtnDisabled,
            pressed && canContinue && styles.pressed,
          ]}
        >
          <Text style={shared.continueBtnText}>Continue</Text>
        </Pressable>
      </View>
      <FloatingKeyboardDismiss />
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useOnboardingColors>) =>
  StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    heading: {
      textAlign: "center",
      marginBottom: 20,
    },
    inputGroup: {
      backgroundColor: colors.cardBg,
      borderRadius: 20,
      overflow: "hidden",
    },
    input: {
      paddingHorizontal: 16,
      height: 52,
      fontSize: 16,
      color: colors.inputText,
      textAlign: "center",
    },
    pressed: {
      opacity: 0.75,
    },
  });
