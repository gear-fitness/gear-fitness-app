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
import Svg, { Path } from "react-native-svg";
import type { StreakInfo } from "../api/streakService";

const FLAME_COLOR = "#FF6A1F";

interface StreakDropdownProps {
  visible: boolean;
  onClose: () => void;
  streakInfo: StreakInfo | null;
  onLogRestDay: () => void;
  onRestore: () => void;
  loading: boolean;
  isDark: boolean;
}

function Flame({ size }: { size: number }) {
  const w = size;
  const h = (size * 18) / 16;
  return (
    <Svg width={w} height={h} viewBox="0 0 16 18" fill="none">
      <Path
        d="M8 1.5c.8 2.6 3 3.8 3 6.8 0 1.4-.7 2.6-1.8 3.3.4-.6.5-1.4.2-2.3-.3-1-1.1-1.6-1.4-2.6C7.2 9 6 10 6 11.7c0 .6.2 1.2.4 1.7C5.3 12.7 4.5 11.4 4.5 10c0-2.5 1.6-3.8 2.6-5.8.4-.8.7-1.8.9-2.7Z"
        stroke={FLAME_COLOR}
        strokeWidth={1.3}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function StreakDropdown({
  visible,
  onClose,
  streakInfo,
  onLogRestDay,
  onRestore,
  loading,
  isDark,
}: StreakDropdownProps) {
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [pendingAction, setPendingAction] = useState<
    "rest" | "restore" | null
  >(null);

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
              <Flame size={64} />
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
                  {tokens > 0 ? "1 available this week" : "Resets Monday"}
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

              {tokens > 0 && (
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
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  streakNumber: {
    fontSize: 60,
    fontWeight: "700",
    letterSpacing: -1.6,
    lineHeight: 64,
    fontVariant: ["tabular-nums"],
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
