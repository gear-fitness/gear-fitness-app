import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { useThemeColors } from "../../hooks/useThemeColors";
import type { Announcement } from "../../api/announcementService";
import { postAnnouncementEvent } from "../../api/announcementService";
import { markAnnouncementSeen } from "../../utils/announcementStorage";

const ACCENT = "#4F6BF6";

/**
 * Routes a campaign row is allowed to send users to. Routes that require
 * params the row may not provide stay off this list; an unknown or
 * disallowed cta_route degrades to a plain dismiss.
 */
const CTA_ROUTES = new Set([
  "Paywall",
  "RoutineList",
  "NutritionGoals",
  "Settings",
  "Activity",
  "HomeTabs",
]);

/**
 * Server-driven "What's New" popup, shown once per announcement after
 * launch. A large centered card over a dimmed backdrop: hero icon,
 * headline, feature rows, footnote, filled CTA, and a "Not now" button.
 * Presented as a transparentModal route:
 * `navigate("WhatsNew", { announcement })`.
 */
export function WhatsNewPopup() {
  const navigation = useNavigation() as any;
  const route = useRoute();
  const colors = useThemeColors();

  const announcement = (
    route.params as { announcement?: Announcement } | undefined
  )?.announcement;

  const scale = useRef(new Animated.Value(0.96)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    if (!announcement) {
      navigation.goBack();
      return;
    }
    postAnnouncementEvent(announcement.id, "IMPRESSION");
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 9,
        tension: 110,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!announcement) return null;

  const animateClose = (after: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => after());
  };

  const dismiss = () => {
    markAnnouncementSeen(announcement.id);
    postAnnouncementEvent(announcement.id, "DISMISS");
    animateClose(() => navigation.goBack());
  };

  const onCtaPress = () => {
    if (!CTA_ROUTES.has(announcement.ctaRoute)) {
      dismiss();
      return;
    }
    if (closing.current) return;
    markAnnouncementSeen(announcement.id);
    postAnnouncementEvent(announcement.id, "CTA");
    if (announcement.ctaRoute === "HomeTabs") {
      // Tab targets (cta_params: {"screen": "Nutrition"}): close the popup
      // first, then switch tabs on the existing navigator underneath. A
      // direct navigate/replace would push a second HomeTabs instance,
      // presented as a modal. Tabs must never open that way.
      animateClose(() => {
        navigation.goBack();
        navigation.navigate(
          announcement.ctaRoute,
          announcement.ctaParams ?? undefined,
        );
      });
    } else {
      closing.current = true;
      navigation.replace(
        announcement.ctaRoute,
        announcement.ctaParams ?? undefined,
      );
    }
  };

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="none"
      />
      {/* No backdrop tap-to-dismiss: exiting requires the CTA or "Not now",
          so every exit records a deliberate choice. */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
            opacity: cardOpacity,
            transform: [{ scale }],
          },
        ]}
      >
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.heroWrap}>
            <View style={styles.heroCircle}>
              <SymbolView
                name={announcement.icon as any}
                size={48}
                tintColor={ACCENT}
                resizeMode="scaleAspectFit"
                style={styles.heroIcon}
                fallback={<Ionicons name="sparkles" size={44} color={ACCENT} />}
              />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {announcement.title}
          </Text>

          {announcement.features?.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconCol}>
                <SymbolView
                  name={(feature.icon ?? "sparkle") as any}
                  size={22}
                  tintColor={colors.text}
                  resizeMode="scaleAspectFit"
                  style={styles.featureIcon}
                  fallback={
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color={colors.text}
                    />
                  }
                />
              </View>
              <View style={styles.featureTextCol}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {feature.title}
                </Text>
                {!!feature.body && (
                  <Text
                    style={[styles.featureBody, { color: colors.secondary }]}
                  >
                    {feature.body}
                  </Text>
                )}
              </View>
            </View>
          ))}

          {!!announcement.body && (
            <Text style={[styles.footnote, { color: colors.secondary }]}>
              {announcement.body}
            </Text>
          )}
        </ScrollView>

        <Pressable
          onPress={onCtaPress}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>{announcement.ctaLabel}</Text>
        </Pressable>

        <Pressable onPress={dismiss} style={styles.secondaryBtn}>
          <Text style={[styles.secondaryBtnText, { color: colors.secondary }]}>
            Not now
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 14,
  },
  scroll: {
    flexGrow: 0,
    marginBottom: 20,
  },
  heroWrap: {
    alignItems: "center",
    marginBottom: 22,
  },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(79,107,246,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    width: 48,
    height: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 31,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    marginBottom: 18,
  },
  featureIconCol: {
    width: 36,
    paddingTop: 1,
  },
  featureIcon: {
    width: 22,
    height: 22,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  featureBody: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 3,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 2,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.85,
  },
});
