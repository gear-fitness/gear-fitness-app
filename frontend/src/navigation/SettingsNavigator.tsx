import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BackButton } from "../components/BackButton";
import { useThemeColors } from "../hooks/useThemeColors";
import { Settings } from "./screens/Settings";
import { EditNameScreen } from "./screens/settings/EditNameScreen";
import { EditUsernameScreen } from "./screens/settings/EditUsernameScreen";
import { ViewEmailScreen } from "./screens/settings/ViewEmailScreen";
import { EditGenderScreen } from "./screens/settings/EditGenderScreen";
import { EditBirthdayScreen } from "./screens/settings/EditBirthdayScreen";
import { EditHeightScreen } from "./screens/settings/EditHeightScreen";
import { EditWeightScreen } from "./screens/settings/EditWeightScreen";

export type SettingsStackParamList = {
  SettingsMain: undefined;
  EditName: undefined;
  EditUsername: undefined;
  ViewEmail: undefined;
  EditGender: undefined;
  EditBirthday: undefined;
  EditHeight: undefined;
  EditWeight: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  const colors = useThemeColors();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="SettingsMain"
        component={Settings}
        options={({ navigation }) => ({
          headerShown: true,
          title: "Profile",
          headerStyle: { backgroundColor: colors.appBg },
          headerTitleStyle: {
            color: colors.text,
            fontWeight: "800" as const,
            fontSize: 30,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <BackButton
              onPress={() => navigation.getParent()?.goBack()}
              color={colors.text}
            />
          ),
        })}
      />
      <Stack.Screen name="EditName" component={EditNameScreen} />
      <Stack.Screen name="EditUsername" component={EditUsernameScreen} />
      <Stack.Screen name="ViewEmail" component={ViewEmailScreen} />
      <Stack.Screen name="EditGender" component={EditGenderScreen} />
      <Stack.Screen name="EditBirthday" component={EditBirthdayScreen} />
      <Stack.Screen name="EditHeight" component={EditHeightScreen} />
      <Stack.Screen name="EditWeight" component={EditWeightScreen} />
    </Stack.Navigator>
  );
}
