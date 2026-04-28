import React, { useState, useMemo } from "react";
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
import { updateUserProfile } from "../../../api/userService";
import { useOnboardingColors } from "../../onboarding/components/useOnboardingColors";
import { makeOnboardingStyles } from "../../onboarding/components/makeOnboardingStyles";
import { SettingsTopBar } from "../../../components/Settings/SettingsTopBar";

export function EditNameScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const [name, setName] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await updateUserProfile(
        undefined,
        undefined,
        undefined,
        undefined,
        trimmed,
      );
      await refreshUser();
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to update name. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!name.trim() && !saving;

  return (
    <View style={[shared.screen, { backgroundColor: colors.screenBg }]}>
      <SettingsTopBar
        title="Name"
        onBack={() => navigation.goBack()}
        onSave={handleSave}
        saveDisabled={!canSave}
      />
      <ScrollView
        style={shared.body}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.bodyContent}
      >
        <Text style={shared.heading}>What's your name?</Text>
        <Text style={shared.subheading}>
          This appears on your public Gear profile.
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.cardBg,
              color: colors.inputText,
              borderColor: colors.border,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor={colors.isDark ? "rgba(0,0,0,0.4)" : colors.secondary}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
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
  input: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    fontSize: 18,
    fontWeight: "500",
  },
});
