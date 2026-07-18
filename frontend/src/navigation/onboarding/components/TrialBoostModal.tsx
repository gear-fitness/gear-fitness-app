import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, Modal } from "react-native";
import { Text } from "../../../components/Text";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";

/** Full-screen upsell shown when the user starts their trial: invite 3 friends
 *  to double the free trial (3 → 7 days), or settle for the 3-day trial. */
export function TrialBoostModal({
  visible,
  onDouble,
  onDecline,
}: {
  visible: boolean;
  onDouble: () => void;
  onDecline: () => void;
}) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDecline}>
      <View style={[shared.screen, { backgroundColor: colors.screenBg }]}>
        <View style={styles.body}>
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.badgeText, { color: colors.accentText }]}>
              2×
            </Text>
          </View>

          <Text style={[styles.heading, { color: colors.text }]}>
            Do you want to 2x your free trial duration?
          </Text>
          <Text style={[styles.sub, { color: colors.secondary }]}>
            Invite 3 friends and unlock a 7-day free trial instead of 3 days.
          </Text>

          <View style={styles.compare}>
            <View
              style={[
                styles.dayBox,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.dayNum, { color: colors.text }]}>3</Text>
              <Text style={[styles.dayLabel, { color: colors.secondary }]}>
                days
              </Text>
            </View>
            <Text style={[styles.arrow, { color: colors.secondary }]}>→</Text>
            <View
              style={[
                styles.dayBox,
                { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
            >
              <Text style={[styles.dayNum, { color: colors.accentText }]}>
                7
              </Text>
              <Text style={[styles.dayLabel, { color: colors.accentText }]}>
                days
              </Text>
            </View>
          </View>
        </View>

        <View style={shared.footer}>
          <Pressable
            onPress={onDouble}
            style={({ pressed }) => [
              shared.continueBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={shared.continueBtnText}>Yes, invite 3 friends</Text>
          </Pressable>
          <Pressable onPress={onDecline} style={styles.decline}>
            <Text style={[styles.declineText, { color: colors.secondary }]}>
              No thanks, start my 3-day trial
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 18,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 34,
    textAlign: "center",
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },
  compare: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  dayBox: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 26,
    alignItems: "center",
    minWidth: 92,
  },
  dayNum: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  arrow: {
    fontSize: 26,
    fontWeight: "700",
  },
  decline: {
    paddingVertical: 12,
    alignItems: "center",
  },
  declineText: {
    fontSize: 15,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.75,
  },
});
