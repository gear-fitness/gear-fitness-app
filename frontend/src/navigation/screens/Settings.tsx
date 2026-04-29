import React, { useState, useEffect, useCallback } from "react";
import {
  ColorValue,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SectionList,
  Linking,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useThemeColors } from "../../hooks/useThemeColors";
import { useTrackTab } from "../../hooks/useTrackTab";
import { useProfilePhoto } from "../../hooks/useProfilePhoto";
import { Avatar } from "../../components/Avatar";
import { AvatarWithCameraOverlay } from "../../components/AvatarWithCameraOverlay";
import {
  SettingsDestructiveCell,
  SettingsCellPosition,
  SettingsToggleCell,
  SettingsValueCell,
} from "../../components/Settings/SettingsRow";
import {
  getHealthKitSyncStatus,
  requestHealthKitPermissions,
  syncOnboardingDataToHealthKit,
  readFromHealthKit,
  diffSnapshot,
} from "../../utils/healthKitSync";
import { updateUserProfile } from "../../api/userService";
import { Height, Weight } from "../onboarding/types";

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  non_binary: "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

type SettingsItem =
  | {
      id: string;
      type: "value";
      label: string;
      value?: string;
      onPress?: () => void;
      showArrow?: boolean;
    }
  | {
      id: string;
      type: "toggle";
      label: string;
      value: boolean;
      onValueChange: (next: boolean) => void;
      disabled?: boolean;
    }
  | {
      id: string;
      type: "destructive";
      title: string;
      onPress: () => void;
    };

type SettingsSection = {
  key: string;
  title?: string;
  data: SettingsItem[];
  footer?: string;
};

// ──────────────────────────────────────────────────────────────
// Helpers: convert backend (inches / lbs) → internal types
// ──────────────────────────────────────────────────────────────

function inchesToHeight(inches: number | null | undefined): Height | undefined {
  if (inches == null) return undefined;
  return {
    unit: "ft_in",
    ft: Math.floor(inches / 12),
    inch: inches % 12,
  };
}

function lbsToWeight(lbs: number | null | undefined): Weight | undefined {
  if (lbs == null) return undefined;
  return { unit: "lbs", value: lbs };
}

// ──────────────────────────────────────────────────────────────

export function Settings() {
  useTrackTab("Settings");

  const { user, logout, refreshUser } = useAuth();
  const navigation = useNavigation<any>();
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { pickAndUpload, uploading } = useProfilePhoto();

  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [muteNotifications, setMuteNotifications] = useState(false);

  // Apple Health state — reflects actual iOS auth status, refreshed on focus.
  const [healthSyncEnabled, setHealthSyncEnabled] = useState(false);
  const [healthUnavailable, setHealthUnavailable] = useState(
    Platform.OS !== "ios",
  );
  const [healthToggleBusy, setHealthToggleBusy] = useState(false);

  const refreshHealthStatus = useCallback(async () => {
    const status = await getHealthKitSyncStatus();
    setHealthSyncEnabled(status === "enabled");
    setHealthUnavailable(status === "unavailable");
  }, []);

  // Re-check every time Settings comes into focus, because the user may
  // have gone to iOS Settings → Health and changed permission while away.
  useFocusEffect(
    useCallback(() => {
      refreshHealthStatus();
    }, [refreshHealthStatus]),
  );

  const handleHealthToggle = async (next: boolean) => {
    if (healthToggleBusy || !user) return;

    // Turning OFF — we can't programmatically revoke HealthKit. Tell
    // the user what to do and flip our view optimistically (the next
    // focus will reconcile with the real iOS auth state).
    if (!next) {
      Alert.alert(
        "Disconnect Apple Health",
        "Open the Health app, tap your profile icon, then tap Apps & Services → Gear Fitness to turn off permissions.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Health",
            onPress: () => Linking.openURL("x-apple-health://"),
          },
        ],
      );
      return;
    }

    // Turning ON — request permissions, then kick off an immediate
    // two-way sync: push our current values, then pull anything newer
    // from HealthKit.
    setHealthToggleBusy(true);
    try {
      await requestHealthKitPermissions();

      // Re-check status after the prompt — if the user denied everything,
      // the toggle should stay off.
      const status = await getHealthKitSyncStatus();
      if (status !== "enabled") {
        setHealthSyncEnabled(false);
        if (status === "disabled") {
          Alert.alert(
            "Permission Denied",
            "Apple Health access was denied. You can enable it in iOS Settings → Privacy & Security → Health.",
          );
        }
        return;
      }

      setHealthSyncEnabled(true);

      // Push app → Health (user's current profile values)
      const height = inchesToHeight(user.heightInches);
      const weight = lbsToWeight(user.weightLbs);
      if (height || weight) {
        await syncOnboardingDataToHealthKit({ height, weight });
      }

      // Pull Health → app (in case HealthKit has newer values)
      const snapshot = await readFromHealthKit();
      const patch = diffSnapshot(
        { heightInches: user.heightInches, weightLbs: user.weightLbs },
        snapshot,
      );
      if (patch.heightInches != null || patch.weightLbs != null) {
        await updateUserProfile(
          patch.heightInches ?? user.heightInches,
          patch.weightLbs ?? user.weightLbs,
          user.age,
          user.username,
          user.displayName,
          user.gender,
        );
        if (typeof refreshUser === "function") {
          await refreshUser();
        }
      }
    } catch (err) {
      console.error("Apple Health toggle failed:", err);
      Alert.alert(
        "Couldn't Enable Apple Health",
        "Something went wrong. Please try again.",
      );
    } finally {
      setHealthToggleBusy(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            navigation.getParent()?.reset({
              index: 0,
              routes: [{ name: "Onboarding" }],
            });
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  const formatHeight = (h: number | null | undefined) => {
    if (!h) return "Not set";
    return `${Math.floor(h / 12)}' ${h % 12}"`;
  };

  const formatWeight = (w: number | null | undefined) => {
    if (!w) return "Not set";
    return `${w} lbs`;
  };

  const formatGender = (g: string | null | undefined) => {
    if (!g) return "Not set";
    return GENDER_LABELS[g] || g;
  };

  const sections: SettingsSection[] = user
    ? [
        {
          key: "profile",
          title: "Profile",
          data: [
            {
              id: "name",
              type: "value",
              label: "Name",
              value: user.displayName || "Not set",
              onPress: () => navigation.navigate("EditName"),
            },
            {
              id: "username",
              type: "value",
              label: "Username",
              value: `@${user.username}`,
              onPress: () => navigation.navigate("EditUsername"),
            },
            {
              id: "email",
              type: "value",
              label: "Email",
              value: user.email,
              onPress: () => navigation.navigate("ViewEmail"),
            },
          ],
        },
        {
          key: "body",
          title: "Body Stats",
          data: [
            {
              id: "gender",
              type: "value",
              label: "Gender",
              value: formatGender(user.gender),
              onPress: () => navigation.navigate("EditGender"),
            },
            {
              id: "age",
              type: "value",
              label: "Age",
              value: user.age ? `${user.age}` : "Not set",
              onPress: () => navigation.navigate("EditBirthday"),
            },
            {
              id: "height",
              type: "value",
              label: "Height",
              value: formatHeight(user.heightInches),
              onPress: () => navigation.navigate("EditHeight"),
            },
            {
              id: "weight",
              type: "value",
              label: "Weight",
              value: formatWeight(user.weightLbs),
              onPress: () => navigation.navigate("EditWeight"),
            },
          ],
        },
        // ── Integrations ──────────────────────────────────────
        ...(!healthUnavailable
          ? [
              {
                key: "integrations",
                title: "Integrations",
                data: [
                  {
                    id: "apple_health",
                    type: "toggle" as const,
                    label: healthToggleBusy
                      ? "Apple Health (syncing…)"
                      : "Apple Health",
                    value: healthSyncEnabled,
                    onValueChange: handleHealthToggle,
                    disabled: healthToggleBusy,
                  },
                ],
                footer: healthSyncEnabled
                  ? "Your height and weight stay in sync with Apple Health. Changes in either place update the other."
                  : "Enable to keep your height and weight in sync with Apple Health.",
              },
            ]
          : []),
        {
          key: "account",
          data: [
            {
              id: "logout",
              type: "destructive",
              title: "Logout",
              onPress: handleLogout,
            },
          ],
        },
      ]
    : [];

  const getPosition = (
    section: SettingsSection,
    index: number,
  ): SettingsCellPosition => {
    if (section.data.length === 1) return "single";
    if (index === 0) return "first";
    if (index === section.data.length - 1) return "last";
    return "middle";
  };

  const renderAvatarHeader = () => {
    if (!user) return null;
    return (
      <TouchableOpacity
        style={styles.avatarSection}
        onPress={pickAndUpload}
        disabled={uploading}
        activeOpacity={0.8}
      >
        <AvatarWithCameraOverlay
          size={88}
          uploading={uploading}
          style={styles.avatarWrap}
        >
          <Avatar
            username={user.username}
            profilePictureUrl={user.profilePictureUrl}
            size={88}
          />
        </AvatarWithCameraOverlay>
        <Text style={[styles.avatarName, { color: themeColors.text }]}>
          {user.displayName || user.username}
        </Text>
        <Text style={[styles.avatarHandle, { color: themeColors.secondary }]}>
          @{user.username}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({
    item,
    index,
    section,
  }: {
    item: SettingsItem;
    index: number;
    section: SettingsSection;
  }) => {
    const position = getPosition(section, index);
    const common = {
      textColor: themeColors.text as ColorValue,
      secondaryTextColor: themeColors.secondary as ColorValue,
      cardColor: themeColors.surface as ColorValue,
      separatorColor: themeColors.separator as ColorValue,
      position: position as SettingsCellPosition,
    };

    if (item.type === "toggle") {
      return (
        <SettingsToggleCell
          {...common}
          label={item.label}
          value={item.value}
          onValueChange={item.onValueChange}
        />
      );
    }
    if (item.type === "destructive") {
      return (
        <View style={styles.logoutSectionWrap}>
          <SettingsDestructiveCell
            cardColor={themeColors.surface as ColorValue}
            separatorColor={themeColors.separator as ColorValue}
            destructiveColor="#ff3b30"
            position={position}
            title={item.title}
            onPress={item.onPress}
          />
        </View>
      );
    }
    return (
      <SettingsValueCell
        {...common}
        label={item.label}
        value={item.value}
        showArrow={item.showArrow}
        onPress={item.onPress}
      />
    );
  };

  return (
    <SectionList
      style={[styles.container, { backgroundColor: themeColors.bg }]}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      renderSectionHeader={({ section }) =>
        section.title ? (
          <Text style={[styles.sectionTitle, { color: themeColors.secondary }]}>
            {section.title}
          </Text>
        ) : null
      }
      renderSectionFooter={({ section }) =>
        section.footer ? (
          <Text
            style={[styles.sectionFooter, { color: themeColors.secondary }]}
          >
            {section.footer}
          </Text>
        ) : null
      }
      ListHeaderComponent={renderAvatarHeader}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{
        paddingTop: 12,
        paddingBottom: insets.bottom + 40,
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },

  avatarWrap: {
    marginBottom: 10,
  },

  avatarName: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  avatarHandle: {
    fontSize: 14,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
    textTransform: "uppercase",
    opacity: 0.5,
  },
  sectionFooter: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 20,
    opacity: 0.6,
  },
  logoutSectionWrap: {
    marginTop: 24,
  },
});
