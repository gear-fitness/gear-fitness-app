import React, { useMemo } from "react";
import { Alert, View, Text, StyleSheet, Pressable } from "react-native";
import * as Notifications from "expo-notifications";
import { OnboardingPermissions } from "../types";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";

interface ToggleSwitchProps {
  value: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useOnboardingColors>;
}

function ToggleSwitch({ value, onToggle, colors }: ToggleSwitchProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.toggle,
        { backgroundColor: value ? colors.accent : colors.unitToggleBg },
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={[styles.knob, { backgroundColor: colors.accentText }, value && styles.knobOn]} />
    </Pressable>
  );
}

interface PermCardProps {
  title: string;
  subtitle: string;
  accentColor: string;
  emoji: string;
  enabled: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useOnboardingColors>;
}

function PermCard({
  title,
  subtitle,
  accentColor,
  emoji,
  enabled,
  onToggle,
  colors,
}: PermCardProps) {
  return (
    <View style={[styles.permCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={[styles.permIconWrap, { backgroundColor: accentColor }]}>
        <Text style={styles.permEmoji}>{emoji}</Text>
      </View>
      <View style={styles.permText}>
        <Text style={[styles.permTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.permSub, { color: colors.secondary }]}>{subtitle}</Text>
      </View>
      <ToggleSwitch value={enabled} onToggle={onToggle} colors={colors} />
    </View>
  );
}

interface PermissionsStepProps {
  permissions?: OnboardingPermissions;
  onPermissionsChange: (p: OnboardingPermissions) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function PermissionsStep({
  permissions,
  onPermissionsChange,
  onBack,
  onContinue,
}: PermissionsStepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const health = permissions?.health ?? false;
  const location = permissions?.location ?? false;
  const notifications = permissions?.notifications ?? false;

  const toggle = async (key: keyof OnboardingPermissions) => {
    if (key === "notifications") {
      if (notifications) {
        onPermissionsChange({
          health,
          location,
          notifications: false,
        });
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === "granted";
      onPermissionsChange({
        health,
        location,
        notifications: granted,
      });
      if (!granted) {
        Alert.alert(
          "Notifications Disabled",
          "Enable notifications in Settings to receive workout reminders.",
        );
      }
      return;
    }

    if (key === "health" || key === "location") {
      const nextValue = !permissions?.[key];
      onPermissionsChange({
        health,
        location,
        notifications,
        [key]: nextValue,
      });
      if (nextValue) {
        Alert.alert(
          "Permission Setup Pending",
          `${key === "health" ? "Apple Health" : "Location"} permission prompts will be enabled in a follow-up update.`,
        );
      }
    }
  };

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={0.8} onBack={onBack} />
      <View style={shared.body}>
        <Text style={shared.heading}>Almost there</Text>
        <Text style={shared.subheading}>
          Enable these to get the most out of Gear Fitness.
        </Text>
        <View style={styles.cards}>
          <PermCard
            title="Apple Health"
            subtitle="Sync steps, heart rate, and workouts"
            accentColor="#FFEEF1"
            emoji="❤️"
            enabled={health}
            onToggle={() => toggle("health")}
            colors={colors}
          />
          <PermCard
            title="Location"
            subtitle="GPS tracking for outdoor workouts"
            accentColor="#E8F1FC"
            emoji="📍"
            enabled={location}
            onToggle={() => toggle("location")}
            colors={colors}
          />
          <PermCard
            title="Notifications"
            subtitle="Reminders for workouts and milestones"
            accentColor="#FFF4E0"
            emoji="🔔"
            enabled={notifications}
            onToggle={() => toggle("notifications")}
            colors={colors}
          />
        </View>
      </View>
      <View style={shared.footer}>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [shared.continueBtn, pressed && styles.pressed]}
        >
          <Text style={shared.continueBtnText}>Continue</Text>
        </Pressable>
        <Pressable onPress={onContinue} style={styles.skip}>
          <Text style={[styles.skipText, { color: colors.secondary }]}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: {
    flex: 1,
    gap: 12,
  },
  permCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  permIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  permEmoji: {
    fontSize: 22,
  },
  permText: {
    flex: 1,
  },
  permTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  permSub: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  toggle: {
    width: 46,
    height: 27,
    borderRadius: 999,
    padding: 3,
    justifyContent: "center",
    flexShrink: 0,
  },
  knob: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  knobOn: {
    alignSelf: "flex-end",
  },
  skip: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.75,
  },
});
