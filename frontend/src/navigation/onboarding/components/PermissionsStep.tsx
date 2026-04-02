import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import { OnboardingPermissions } from "../types";
import { OnboardingTopBar } from "./OnboardingTopBar";

interface ToggleSwitchProps {
  value: boolean;
  onToggle: () => void;
}

function ToggleSwitch({ value, onToggle }: ToggleSwitchProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.toggle, value && styles.toggleOn]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
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
}

function PermCard({
  title,
  subtitle,
  accentColor,
  emoji,
  enabled,
  onToggle,
}: PermCardProps) {
  return (
    <View style={styles.permCard}>
      <View style={[styles.permIconWrap, { backgroundColor: accentColor }]}>
        <Text style={styles.permEmoji}>{emoji}</Text>
      </View>
      <View style={styles.permText}>
        <Text style={styles.permTitle}>{title}</Text>
        <Text style={styles.permSub}>{subtitle}</Text>
      </View>
      <ToggleSwitch value={enabled} onToggle={onToggle} />
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
  const [health, setHealth] = useState(permissions?.health ?? false);
  const [location, setLocation] = useState(permissions?.location ?? false);
  const [notifications, setNotifications] = useState(
    permissions?.notifications ?? false
  );

  const toggle = (key: keyof OnboardingPermissions, val: boolean) => {
    const updated = { health, location, notifications, [key]: !val };
    if (key === "health") setHealth(!val);
    if (key === "location") setLocation(!val);
    if (key === "notifications") setNotifications(!val);
    onPermissionsChange(updated);
  };

  return (
    <View style={styles.screen}>
      <OnboardingTopBar progress={0.8} onBack={onBack} />
      <View style={styles.body}>
        <Text style={styles.heading}>Almost there</Text>
        <Text style={styles.subheading}>
          Enable these to get the most out of Gear Fitness.
        </Text>
        <View style={styles.cards}>
          <PermCard
            title="Apple Health"
            subtitle="Sync steps, heart rate, and workouts"
            accentColor="#FFEEF1"
            emoji="❤️"
            enabled={health}
            onToggle={() => toggle("health", health)}
          />
          <PermCard
            title="Location"
            subtitle="GPS tracking for outdoor workouts"
            accentColor="#E8F1FC"
            emoji="📍"
            enabled={location}
            onToggle={() => toggle("location", location)}
          />
          <PermCard
            title="Notifications"
            subtitle="Reminders for workouts and milestones"
            accentColor="#FFF4E0"
            emoji="🔔"
            enabled={notifications}
            onToggle={() => toggle("notifications", notifications)}
          />
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity onPress={onContinue} activeOpacity={0.8} style={styles.continueBtn}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onContinue} style={styles.skip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  heading: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0D0D0D",
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 5,
  },
  subheading: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 21,
    marginBottom: 24,
  },
  cards: {
    flex: 1,
    gap: 12,
  },
  permCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
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
    color: "#0D0D0D",
  },
  permSub: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
    lineHeight: 18,
  },
  toggle: {
    width: 46,
    height: 27,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.14)",
    padding: 3,
    justifyContent: "center",
    flexShrink: 0,
  },
  toggleOn: {
    backgroundColor: "#000",
  },
  knob: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  knobOn: {
    alignSelf: "flex-end",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 10,
  },
  continueBtn: {
    height: 60,
    borderRadius: 999,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  skip: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
    color: "#8E8E93",
  },
});
