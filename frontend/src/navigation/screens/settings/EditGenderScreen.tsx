import React, { useState, useMemo } from "react";
import { View, Text, Alert, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../context/AuthContext";
import { updateUserProfile } from "../../../api/userService";
import { Gender } from "../../onboarding/types";
import { useOnboardingColors } from "../../onboarding/components/useOnboardingColors";
import { makeOnboardingStyles } from "../../onboarding/components/makeOnboardingStyles";
import { GenderCardList } from "../../onboarding/components/GenderCardList";
import { FloatingCloseButton } from "../../../components/FloatingCloseButton";

export function EditGenderScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const colors = useOnboardingColors();
  const insets = useSafeAreaInsets();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const [gender, setGender] = useState<Gender | undefined>(
    user?.gender as Gender | undefined,
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!gender || saving) return;
    setSaving(true);
    try {
      await updateUserProfile(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        gender,
      );
      await refreshUser();
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to update gender. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!gender && !saving;

  return (
    <View style={[shared.screen, { backgroundColor: colors.screenBg }]}>
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      <View style={[shared.body, { paddingTop: insets.top + 60 }]}>
        <Text style={shared.heading}>What's your gender?</Text>
        <Text style={shared.subheading}>
          Used to calculate your calorie and macro goals accurately.
        </Text>
        <GenderCardList
          selected={gender}
          onSelect={setGender}
          colors={colors}
        />
      </View>
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
