import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { checkUsernameAvailability } from "../../../api/userService";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { FloatingKeyboardDismiss } from "../../../components/FloatingKeyboardDismiss";

type Status = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

export function UsernameStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [username, setUsername] = useState(draft.profile?.username ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const requestId = useRef(0);

  const handleChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9._]/g, "");
    setUsername(cleaned);
    updateDraft({ profile: { ...draft.profile, username: cleaned } });
  };

  const normalized = username.trim();

  useEffect(() => {
    const id = ++requestId.current;
    setMessage(null);

    if (!normalized) {
      setStatus("idle");
      return;
    }
    if (normalized.length < 3) {
      setStatus("invalid");
      setMessage("Username must be at least 3 characters.");
      return;
    }

    setStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(normalized);
        if (requestId.current !== id) return;
        if (result.available) {
          setStatus("available");
          setMessage("Username is available.");
          return;
        }
        setStatus("taken");
        setMessage(result.reason ?? "Username is already taken.");
      } catch {
        if (requestId.current !== id) return;
        setStatus("error");
        setMessage("Could not verify username right now. Please try again.");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [normalized]);

  const canContinue = normalized.length >= 3 && status === "available";

  const statusColor =
    status === "available"
      ? colors.accent
      : status === "checking" || status === "idle"
        ? colors.secondary
        : "#FF453A";

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <View style={styles.center}>
        <Text style={[shared.heading, styles.heading]}>Choose a username</Text>
        <Text style={[styles.sub, { color: colors.secondary }]}>
          This can only be changed once in a while, so choose wisely.
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="yourhandle"
            placeholderTextColor={colors.handle}
            value={username}
            onChangeText={handleChange}
            autoFocus
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>
        {!!message && (
          <Text style={[styles.statusText, { color: statusColor }]}>
            {message}
          </Text>
        )}
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
      marginBottom: 8,
    },
    sub: {
      textAlign: "center",
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 24,
      alignSelf: "center",
      maxWidth: 300,
    },
    inputGroup: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderRadius: 20,
      paddingHorizontal: 16,
      height: 52,
    },
    atSign: {
      fontSize: 16,
      color: colors.handle,
      marginRight: 2,
    },
    input: {
      flex: 1,
      height: "100%",
      fontSize: 16,
      color: colors.inputText,
    },
    statusText: {
      marginTop: 12,
      fontSize: 13,
      fontWeight: "500",
      textAlign: "center",
    },
    pressed: {
      opacity: 0.75,
    },
  });
