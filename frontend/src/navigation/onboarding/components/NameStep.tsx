import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { GearSpinVideo } from "./GearSpinVideo";
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

  // Type the heading out one character at a time, with a blinking cursor.
  const HEADING = "What's your name?";
  const [typedLen, setTypedLen] = useState(0);
  useEffect(() => {
    if (typedLen >= HEADING.length) return;
    const id = setTimeout(() => setTypedLen((n) => n + 1), 55);
    return () => clearTimeout(id);
  }, [typedLen]);

  const doneTyping = typedLen >= HEADING.length;
  const [cursorOn, setCursorOn] = useState(true);
  useEffect(() => {
    // Blink only while typing; drop the cursor entirely once finished.
    if (doneTyping) {
      setCursorOn(false);
      return;
    }
    const id = setInterval(() => setCursorOn((c) => !c), 500);
    return () => clearInterval(id);
  }, [doneTyping]);

  const handleNameChange = (val: string) => {
    setName(val);
    // Persist to the shared profile so it pre-fills "Create your profile".
    updateDraft({ profile: { ...draft.profile, name: val } });
  };

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <View style={styles.center}>
        <View style={styles.aboveHeading}>
          <GearSpinVideo style={styles.video} playLastSeconds={1.5} />
        </View>
        <Text style={[shared.heading, styles.heading]}>
          {HEADING.slice(0, typedLen)}
          {!doneTyping && <Text style={{ opacity: cursorOn ? 1 : 0 }}>|</Text>}
        </Text>
        <View style={styles.belowHeading}>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.handle}
              value={name}
              onChangeText={handleNameChange}
              autoComplete="name"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>
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
        {/* Name is optional: signing in with Apple/Google already provides it,
            and a returning Apple ID may not resend it, so we never require it. */}
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
        >
          <Text style={styles.skipText}>Skip for now</Text>
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
      paddingHorizontal: 24,
    },
    // Equal flex regions above and below pin the heading to the vertical
    // centre: the video sits just above it, the input box just below.
    aboveHeading: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "center",
    },
    belowHeading: {
      flex: 1,
      alignItems: "stretch",
    },
    video: {
      width: 200,
      height: 135,
      alignSelf: "center",
      marginBottom: 16,
    },
    heading: {
      // Span the full width so textAlign centres the text on a stable box
      // instead of the node shrink-wrapping and shifting as it types out.
      // No vertical margin here: keep the text itself on the centre line and
      // put the gap to the input below (see inputGroup.marginTop).
      alignSelf: "stretch",
      textAlign: "center",
    },
    inputGroup: {
      backgroundColor: colors.cardBg,
      borderRadius: 20,
      overflow: "hidden",
      marginTop: 20,
    },
    input: {
      paddingHorizontal: 16,
      height: 52,
      fontSize: 16,
      color: colors.inputText,
      textAlign: "center",
    },
    skipBtn: {
      alignItems: "center",
      paddingVertical: 14,
      marginTop: 4,
    },
    skipText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.secondary,
    },
    pressed: {
      opacity: 0.75,
    },
  });
