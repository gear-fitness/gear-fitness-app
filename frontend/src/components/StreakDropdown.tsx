import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { StreakInfo } from "../api/streakService";

interface StreakDropdownProps {
  visible: boolean;
  onClose: () => void;
  streakInfo: StreakInfo | null;
  onLogRestDay: () => void;
  onRestore: () => void;
  loading: boolean;
  isDark: boolean;
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
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const tokens = streakInfo?.restoreTokensRemaining ?? 0;
  const todayLogged = streakInfo?.todayLogged ?? false;
  const currentStreak = streakInfo?.currentStreak ?? 0;
  const longestStreak = streakInfo?.longestStreak ?? 0;

  const cardBg = isDark ? "#1C1C1E" : "#F2F2F7";
  const textColor = isDark ? "#fff" : "#000";
  const subtextColor = isDark ? "#999" : "#666";
  const dividerColor = isDark ? "#3A3A3C" : "#D1D1D6";
  const buttonBg = isDark ? "#2C2C2E" : "#E5E5EA";

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
              backgroundColor: cardBg,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Streak Display */}
            <View style={styles.streakHeader}>
              <View style={styles.fireGlow}>
                <Text style={styles.fireEmoji}>🔥</Text>
              </View>
              <Text style={[styles.streakNumber, { color: textColor }]}>
                {currentStreak}
              </Text>
            </View>
            <Text style={[styles.streakTitle, { color: textColor }]}>
              Day Streak
            </Text>
            <Text style={[styles.longestText, { color: subtextColor }]}>
              Longest streak: {longestStreak} days
            </Text>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            {/* Restore Tokens */}
            <View style={styles.tokenRow}>
              <Text style={styles.tokenIcon}>🛡️</Text>
              <View style={styles.tokenInfo}>
                <Text style={[styles.tokenLabel, { color: textColor }]}>
                  Restore Tokens
                </Text>
                <Text style={[styles.tokenSub, { color: subtextColor }]}>
                  {tokens > 0
                    ? `${tokens} token remaining this week`
                    : "0 tokens — resets Monday"}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            {/* Actions */}
            <View style={styles.actions}>
              {/* Log Rest Day Button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: buttonBg,
                    opacity: todayLogged || loading ? 0.5 : 1,
                  },
                ]}
                onPress={onLogRestDay}
                disabled={todayLogged || loading}
              >
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color={textColor}
                    style={styles.buttonSpinner}
                  />
                ) : (
                  <Text style={styles.restIcon}>😴</Text>
                )}
                <Text style={[styles.actionButtonText, { color: textColor }]}>
                  {todayLogged ? "Already Logged Today" : "Log Rest Day"}
                </Text>
              </TouchableOpacity>

              {/* Restore Streak Button */}
              {tokens > 0 && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.restoreButton]}
                  onPress={onRestore}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                      style={styles.buttonSpinner}
                    />
                  ) : (
                    <Text style={styles.restIcon}>⚡</Text>
                  )}
                  <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                    Restore Streak
                  </Text>
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
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fireGlow: {
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  fireEmoji: {
    fontSize: 40,
  },
  streakNumber: {
    fontSize: 56,
    fontWeight: "900",
    lineHeight: 62,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2,
  },
  longestText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tokenIcon: {
    fontSize: 28,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  tokenSub: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  restoreButton: {
    backgroundColor: "#FF6B35",
  },
  restIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  buttonSpinner: {
    marginRight: 4,
  },
});
