import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";

interface StepScaffoldProps {
  progress: number;
  onBack: () => void;
  /** Omit to render no heading block — the step supplies its own body. */
  heading?: string;
  subheading?: string;
  children: React.ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  /** Wrap the body in a ScrollView for content taller than the screen. */
  scroll?: boolean;
  /** Extra content rendered in the footer above/below the continue button. */
  footerExtra?: React.ReactNode;
  /** Extra space above the heading, to push it down from the top bar. */
  headingOffset?: number;
}

export function StepScaffold({
  progress,
  onBack,
  heading,
  subheading,
  children,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  scroll = false,
  footerExtra,
  headingOffset = 0,
}: StepScaffoldProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const body = (
    <>
      {heading ? (
        <>
          <Text
            style={[
              shared.heading,
              headingOffset ? { marginTop: headingOffset } : null,
            ]}
          >
            {heading}
          </Text>
          {subheading ? (
            <Text style={shared.subheading}>{subheading}</Text>
          ) : (
            <View style={styles.headingGap} />
          )}
        </>
      ) : null}
      {children}
    </>
  );

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      {scroll ? (
        <ScrollView
          style={shared.body}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={shared.body}>{body}</View>
      )}
      <View style={shared.footer}>
        <Pressable
          onPress={onContinue}
          disabled={continueDisabled}
          style={({ pressed }) => [
            shared.continueBtn,
            continueDisabled && shared.continueBtnDisabled,
            pressed && !continueDisabled && styles.pressed,
          ]}
        >
          <Text style={shared.continueBtnText}>{continueLabel}</Text>
        </Pressable>
        {footerExtra}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headingGap: {
    height: 18,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  pressed: {
    opacity: 0.75,
  },
});
