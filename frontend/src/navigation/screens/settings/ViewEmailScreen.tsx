import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../../context/AuthContext";
import { useOnboardingColors } from "../../onboarding/components/useOnboardingColors";
import { makeOnboardingStyles } from "../../onboarding/components/makeOnboardingStyles";
import { SettingsTopBar } from "../../../components/Settings/SettingsTopBar";

export function ViewEmailScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  return (
    <View style={[shared.screen, { backgroundColor: colors.screenBg }]}>
      <SettingsTopBar title="Email" onBack={() => navigation.goBack()} />
      <View style={shared.body}>
        <Text style={shared.heading}>Associated email</Text>
        <Text style={shared.subheading}>
          This is the email linked to your Gear account.
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.email, { color: colors.text }]}>
            {user?.email}
          </Text>
          <Text style={[styles.note, { color: colors.secondary }]}>
            To change your email, contact Gear support or manage it through your
            sign-in provider settings.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
  },
  email: {
    fontSize: 18,
    fontWeight: "500",
  },
  note: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
});
