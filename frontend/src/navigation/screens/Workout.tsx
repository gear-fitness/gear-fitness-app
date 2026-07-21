import React, { useState } from "react";
import { Text, FontScaleProvider } from "../../components/Text";
import { StyleSheet, View, TouchableOpacity, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import Svg, { Path } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import { useWorkoutTimer } from "../../context/WorkoutContext";
import { useTrackTab } from "../../hooks/useTrackTab";
import { useAuth } from "../../context/AuthContext";
import { useTier } from "../../hooks/useTier";
import { TodaysRoutines } from "../../components/TodaysRoutines";
import { StreakDropdown } from "../../components/StreakDropdown";
import { StreakIcon } from "../../components/StreakIcon";
import { streakService, type StreakInfo } from "../../api/streakService";
import { QUOTES } from "../../constants/quotes";
import { track } from "../../analytics";

const SERIF = "LibreCaslonText_400Regular";

function dailyQuote(): string {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const day = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return QUOTES[day % QUOTES.length];
}

function formatTime(t: number): string {
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function todayOverline(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

export function Workout() {
  useTrackTab("Workouts");

  const navigation = useNavigation() as any;
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const { user, refreshUser } = useAuth();
  const { atLeast } = useTier();
  const { playerVisible, seconds, running, exercises, reset } =
    useWorkoutTimer();

  const [streakDropdownVisible, setStreakDropdownVisible] = useState(false);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [streakLoading, setStreakLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshUser();
      streakService.getStreakInfo().then(setStreakInfo).catch(console.error);
    }, []),
  );

  const streak = user?.workoutStats?.workoutStreak ?? 0;
  const inProgress = playerVisible;

  const handleLogRestDay = async () => {
    setStreakLoading(true);
    try {
      const updated = await streakService.logRestDay();
      track("rest_day_logged");
      setStreakInfo(updated);
      refreshUser();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data || "Could not log rest day");
    } finally {
      setStreakLoading(false);
    }
  };

  const handleRestore = async () => {
    setStreakLoading(true);
    try {
      const updated = await streakService.useRestoreToken();
      track("streak_restored");
      setStreakInfo(updated);
      refreshUser();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data || "Could not restore streak");
    } finally {
      setStreakLoading(false);
    }
  };

  const glassAvailable = isLiquidGlassAvailable();

  const t = isDark
    ? {
        bg: "#0a0a0a",
        surface: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        border: "rgba(255,255,255,0.08)",
      }
    : {
        bg: "#fafafa",
        surface: "#fff",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        textFaint: "rgba(0,0,0,0.4)",
        border: "rgba(0,0,0,0.08)",
      };

  const handlePrimaryPress = () => {
    if (inProgress) {
      navigation.navigate("WorkoutFlow", { screen: "WorkoutComplete" });
    } else {
      // Starting a fresh workout — explicitly clear any leftover state
      // (timer, exercises, persisted storage) before navigating. The
      // ExerciseDetail mount-effect's start() will release the barrier.
      reset();
      navigation.navigate("WorkoutFlow", { screen: "ExerciseSelect" });
    }
  };

  const ctaLabel = inProgress ? "End Workout" : "Start Workout";

  return (
    <FontScaleProvider max={1}>
      <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
        {/* Header: streak + nav */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.streakBlock}
            onPress={() => {
              setStreakDropdownVisible(true);
              streakService
                .getStreakInfo()
                .then(setStreakInfo)
                .catch(console.error);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.streakRow}>
              <StreakIcon streak={streak} size={46} isDark={isDark} />
              <Text style={[styles.streakNumber, { color: t.text }]}>
                {streak}
              </Text>
            </View>
            <Text style={[styles.streakLabel, { color: t.textMuted }]}>
              STREAK
            </Text>
          </TouchableOpacity>

          <View style={styles.navRow}>
            <TouchableOpacity
              accessibilityLabel="Exercises"
              activeOpacity={0.7}
              onPress={() => navigation.navigate("ExerciseList")}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: glassAvailable ? "transparent" : t.surface,
                  borderColor: glassAvailable ? "transparent" : t.border,
                },
              ]}
            >
              {glassAvailable && (
                <GlassView
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
                  glassEffectStyle="regular"
                  isInteractive
                />
              )}
              <MaterialCommunityIcons
                name="weight-lifter"
                size={22}
                color={t.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Routines"
              activeOpacity={0.7}
              onPress={() => navigation.navigate("RoutineList")}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: glassAvailable ? "transparent" : t.surface,
                  borderColor: glassAvailable ? "transparent" : t.border,
                },
              ]}
            >
              {glassAvailable && (
                <GlassView
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
                  glassEffectStyle="regular"
                  isInteractive
                />
              )}
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 3h12v18l-6-4-6 4V3z"
                  stroke={t.text}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  fill={t.text}
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero: 50/50 split */}
        <View style={styles.hero}>
          {/* Top half: quote/timer centered */}
          <View style={styles.topHalf}>
            <Text style={[styles.overline, { color: t.textMuted }]}>
              {inProgress ? "IN PROGRESS" : todayOverline()}
            </Text>
            {inProgress ? (
              <View style={styles.elapsedBlock}>
                <Text style={[styles.elapsedLabel, { color: t.textMuted }]}>
                  ELAPSED
                </Text>
                <Text style={[styles.elapsedTime, { color: t.text }]}>
                  {formatTime(seconds)}
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.quote, { color: t.text, fontFamily: SERIF }]}
              >
                {dailyQuote()}
              </Text>
            )}
          </View>

          {/* Bottom half: CTA + routines */}
          <View style={styles.bottomHalf}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.primaryCta, { borderColor: t.text }]}
              onPress={handlePrimaryPress}
            >
              <Text style={[styles.primaryCtaText, { color: t.text }]}>
                {ctaLabel}
              </Text>
            </TouchableOpacity>

            {!inProgress && (
              <View style={styles.routinesWrap}>
                <TodaysRoutines />
              </View>
            )}
          </View>
        </View>
        <StreakDropdown
          visible={streakDropdownVisible}
          onClose={() => setStreakDropdownVisible(false)}
          streakInfo={streakInfo}
          onLogRestDay={handleLogRestDay}
          onRestore={handleRestore}
          loading={streakLoading}
          isDark={isDark}
          isPlus={atLeast("PLUS")}
          onUpsell={() => {
            setStreakDropdownVisible(false);
            navigation.navigate("PlusUpsell", {
              feature: "Restore your streak with Plus",
            });
          }}
        />
      </SafeAreaView>
    </FontScaleProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 14,
  },

  streakBlock: {
    alignItems: "center",
  },

  streakRow: {
    flexDirection: "row",
    // Bottom-align so the number's baseline sits on the flame's base, rather
    // than floating at the geometric center of the taller full-size flame.
    alignItems: "flex-end",
    gap: 2,
  },

  streakNumber: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.6,
    lineHeight: 34,
    fontVariant: ["tabular-nums"],
    // The flame fills its box edge-to-edge, but digits sit on the baseline with
    // empty descent space below them. Drop the number so its baseline lands on
    // the flame's base (paired with the row's flex-end alignment).
    transform: [{ translateY: 6 }],
  },

  streakLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginTop: 6,
    textAlign: "center",
  },

  navRow: {
    flexDirection: "row",
    gap: 8,
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  hero: {
    flex: 1,
    flexDirection: "column",
    paddingBottom: 24,
  },

  topHalf: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
  },

  overline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: "center",
  },

  quote: {
    fontSize: 32,
    fontWeight: "400",
    letterSpacing: -0.2,
    lineHeight: 38,
    textAlign: "center",
  },

  elapsedBlock: {
    alignItems: "center",
  },

  elapsedLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },

  elapsedTime: {
    marginTop: 10,
    fontSize: 92,
    fontWeight: "700",
    letterSpacing: -3,
    lineHeight: 92,
    fontVariant: ["tabular-nums"],
  },

  bottomHalf: {
    flex: 1,
  },

  primaryCta: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryCtaText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  routinesWrap: {
    marginTop: 8,
  },
});
