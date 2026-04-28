import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../../context/AuthContext";
import {
  updateUserProfile,
  checkUsernameAvailability,
} from "../../../api/userService";
import { useOnboardingColors } from "../../onboarding/components/useOnboardingColors";
import { makeOnboardingStyles } from "../../onboarding/components/makeOnboardingStyles";
import { SettingsTopBar } from "../../../components/Settings/SettingsTopBar";

type AvailabilityStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid";

export function EditUsernameScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const [username, setUsername] = useState(user?.username ?? "");
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUnchanged = username === user?.username;
  const canSave =
    !saving && username.length >= 3 && (isUnchanged || status === "available");

  useEffect(() => {
    if (isUnchanged || username.length < 3) {
      setStatus("idle");
      return;
    }
    if (!/^[a-z0-9._]+$/.test(username)) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { available } = await checkUsernameAvailability(username);
        setStatus(available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, isUnchanged]);

  const handleChange = (text: string) => {
    setUsername(text.toLowerCase().replace(/[^a-z0-9._]/g, ""));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateUserProfile(undefined, undefined, undefined, username);
      await refreshUser();
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to update username. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const statusColor =
    status === "available"
      ? "#34C759"
      : status === "taken" || status === "invalid"
        ? colors.danger
        : colors.secondary;

  const statusText =
    status === "available"
      ? "Username is available"
      : status === "taken"
        ? "Username is taken"
        : status === "invalid"
          ? "Letters, numbers, periods and underscores only"
          : status === "checking"
            ? "Checking..."
            : isUnchanged
              ? "This is your current username"
              : "";

  return (
    <View style={[shared.screen, { backgroundColor: colors.screenBg }]}>
      <SettingsTopBar
        title="Username"
        onBack={() => navigation.goBack()}
        onSave={handleSave}
        saveDisabled={!canSave}
      />
      <ScrollView
        style={shared.body}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.bodyContent}
      >
        <Text style={shared.heading}>Choose a username</Text>
        <Text style={shared.subheading}>
          Your unique handle on Gear. Letters, numbers, periods and underscores
          only.
        </Text>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.prefix, { color: colors.secondary }]}>@</Text>
          <TextInput
            style={[styles.input, { color: colors.inputText }]}
            value={username}
            onChangeText={handleChange}
            placeholder="yourhandle"
            placeholderTextColor={colors.secondary}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>
        {statusText ? (
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
        ) : null}
      </ScrollView>
      <View style={shared.footer}>
        <Pressable
          style={[shared.continueBtn, !canSave && shared.continueBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={shared.continueBtnText}>
            {saving ? "Saving..." : "Save changes"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bodyContent: {
    paddingBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  prefix: {
    fontSize: 18,
    fontWeight: "500",
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
  },
  statusText: {
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
  },
});
