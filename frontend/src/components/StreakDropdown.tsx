import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { StreakInfo } from "../api/streakService";
import { StreakIcon } from "./StreakIcon";

/** Brand orange used for the dropdown's call-to-action buttons. */
const FLAME_COLOR = "#FF6A1F";

interface StreakDropdownProps {
  visible: boolean;
  onClose: () => void;
  streakInfo: StreakInfo | null;
  onLogRestDay: () => void;
  onRestore: () => void;
  loading: boolean;
  isDark: boolean;
  /** Whether the user has Plus (streak restores are a Plus+ benefit). */
  isPlus: boolean;
  /** Invoked when a Basic user taps the locked restore affordance. */
  onUpsell: () => void;
}

export function StreakDropdown({
  visible,
  onClose,
  streakInfo,
  onLogRestDay,
  onRestore,
  loading,
  isDark,
  isPlus,
  onUpsell,
}: StreakDropdownProps) {
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [pendingAction, setPendingAction] = useState<"rest" | "restore" | null>(
    null,
  );

  useEffect(() => {
    if (!loading) setPendingAction(null);
  }, [loading]);

  const handleRestPress = () => {
    setPendingAction("rest");
    onLogRestDay();
  };

  const handleRestorePress = () => {
    setPendingAction("restore");
    onRestore();
  };

  const restLoading = loading && pendingAction === "rest";
  const restoreLoading = loading && pendingAction === "restore";

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.96);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 9,
          tension: 110,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const tokens = streakInfo?.restoreTokensRemaining ?? 0;
  const todayLogged = streakInfo?.todayLogged ?? false;
  const currentStreak = streakInfo?.currentStreak ?? 0;
  const longestStreak = streakInfo?.longestStreak ?? 0;

  const t = isDark
    ? {
        bg: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        border: "rgba(255,255,255,0.08)",
        divider: "rgba(255,255,255,0.06)",
      }
    : {
        bg: "#fff",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        textFaint: "rgba(0,0,0,0.4)",
        border: "rgba(0,0,0,0.08)",
        divider: "rgba(0,0,0,0.06)",
      };

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: t.bg,
              borderColor: t.border,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Streak hero */}
            <View style={styles.streakHeader}>
              <StreakIcon streak={currentStreak} size={64} isDark={isDark} />
              <Text style={[styles.streakNumber, { color: t.text }]}>
                {currentStreak}
              </Text>
            </View>
            <Text style={[styles.overline, { color: t.textMuted }]}>
              DAY STREAK
            </Text>
            <Text style={[styles.longestText, { color: t.textFaint }]}>
              Longest {longestStreak} {longestStreak === 1 ? "day" : "days"}
            </Text>

            <View style={[styles.divider, { backgroundColor: t.divider }]} />

            {/* Tokens */}
            <View style={styles.tokenRow}>
              <View>
                <Text style={[styles.overline, { color: t.textMuted }]}>
                  RESTORE TOKENS
                </Text>
                <Text style={[styles.tokenSub, { color: t.textFaint }]}>
                  {isPlus
                    ? tokens > 0
                      ? `${tokens} available this month`
                      : "Resets monthly"
                    : "Plus members get 4 / month"}
                </Text>
              </View>
              <Text style={[styles.tokenCount, { color: t.text }]}>
                {tokens}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: t.divider }]} />

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.outlinedButton,
                  {
                    borderColor: t.text,
                    opacity: todayLogged || loading ? 0.35 : 1,
                  },
                ]}
                onPress={handleRestPress}
                disabled={todayLogged || loading}
                activeOpacity={0.7}
              >
                {restLoading ? (
                  <ActivityIndicator size="small" color={t.text} />
                ) : (
                  <Text style={[styles.outlinedButtonText, { color: t.text }]}>
                    {todayLogged ? "Logged Today" : "Log Rest Day"}
                  </Text>
                )}
              </TouchableOpacity>

              {!isPlus ? (
                <TouchableOpacity
                  style={[
                    styles.filledButton,
                    { flexDirection: "row", backgroundColor: t.text },
                  ]}
                  onPress={onUpsell}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="lock-closed"
                    size={16}
                    color={t.bg}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.filledButtonText, { color: t.bg }]}>
                    Restore Streak with Plus
                  </Text>
                </TouchableOpacity>
              ) : (
                tokens > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.filledButton,
                      {
                        backgroundColor: FLAME_COLOR,
                        opacity: loading ? 0.5 : 1,
                      },
                    ]}
                    onPress={handleRestorePress}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {restoreLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.filledButtonText}>Restore Streak</Text>
                    )}
                  </TouchableOpacity>
                )
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  streakHeader: {
    flexDirection: "row",
    // Bottom-align so the number's baseline sits on the flame's base, rather
    // than floating at the geometric center of the taller full-size flame.
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
  },
  streakNumber: {
    fontSize: 60,
    fontWeight: "700",
    letterSpacing: -1.6,
    lineHeight: 64,
    fontVariant: ["tabular-nums"],
    // Drop the number so its baseline lands on the flame's base (digits sit on
    // the baseline with empty descent space below them). Scaled to this font size.
    transform: [{ translateY: 11 }],
  },
  overline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    textAlign: "center",
    marginTop: 6,
  },
  longestText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    letterSpacing: -0.1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 20,
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tokenSub: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: -0.1,
    textAlign: "left",
  },
  tokenCount: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.6,
    lineHeight: 34,
    fontVariant: ["tabular-nums"],
  },
  actions: {
    gap: 10,
  },
  outlinedButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  outlinedButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  filledButton: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  filledButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
