import React, { useEffect } from "react";
import { Text } from "@react-navigation/elements";
import { StyleSheet, View, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import { useColorScheme } from "react-native";

import stopwatch from "../../assets/stopwatch.png";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { useTrackTab } from "../../hooks/useTrackTab";
import { useAuth } from "../../context/AuthContext";
import { TodaysRoutines } from "../../components/TodaysRoutines";
import { StartCountdownOverlay } from "../../components/StartCountdownOverlay";
import { useStartCountdown } from "../../hooks/useStartCountdown";

export function Workout() {
  useTrackTab("Workouts");

  const navigation = useNavigation() as any;
  const { colors } = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const { user, refreshUser } = useAuth();
  const { playerVisible, seconds, running, exercises } = useWorkoutTimer();
  const {
    isCountdownVisible,
    countdownValue,
    startCountdown,
    cancelCountdown,
  } = useStartCountdown({
    onComplete: () => navigation.navigate("ExerciseSelect"),
  });

  // Refresh user profile (includes streak data) when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshUser();
    }, []),
  );

  const streak = user?.workoutStats?.workoutStreak ?? 0;

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: isCountdownVisible ? { display: "none" } : undefined,
    });

    return () => {
      navigation.setOptions({ tabBarStyle: undefined });
    };
  }, [isCountdownVisible, navigation]);

  const handleStartPress = () => {
    startCountdown();
  };

  const handleExercisesPress = () => {
    navigation.navigate("ExerciseList");
  };

  const handleRoutinesPress = () => {
    navigation.navigate("RoutineList");
  };

  const formatTime = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0",
    )}`;

  return (
    <SafeAreaView
      style={[
        styles.newContainer,
        { backgroundColor: isDark ? "black" : "white" },
      ]}
    >
      {/* Header - Always visible */}
      <View style={styles.headerContainer}>
        {/* Left: Streak Counter */}
        <View style={styles.streakContainer}>
          <View style={styles.streakRow}>
            <View style={styles.streakShadowLayer1}>
              <View style={styles.streakShadowLayer2}>
                <Text style={styles.fireIcon}>🔥</Text>
              </View>
            </View>
            <Text
              style={[styles.streakNumber, { color: isDark ? "#fff" : "#000" }]}
            >
              {streak}
            </Text>
          </View>
          <Text
            style={[styles.streakLabel, { color: isDark ? "#999" : "#666" }]}
          >
            DAY STREAK
          </Text>
        </View>

        {/* Right: Action Buttons */}
        <View style={styles.headerActions}>
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? colors.card : "white" },
              ]}
              onPress={handleExercisesPress}
            >
              <Text style={styles.exercisesIcon}>🏋️</Text>
            </TouchableOpacity>
            <Text
              style={[styles.actionLabel, { color: isDark ? "#999" : "#666" }]}
            >
              Exercises
            </Text>
          </View>

          <View style={styles.actionItem}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? colors.card : "white" },
              ]}
              onPress={handleRoutinesPress}
            >
              <Text style={[styles.checkIcon, { color: "#007AFF" }]}>✓</Text>
            </TouchableOpacity>
            <Text
              style={[styles.actionLabel, { color: isDark ? "#999" : "#666" }]}
            >
              Routines
            </Text>
          </View>
        </View>
      </View>

      {/* Body - Conditional */}
      {playerVisible ? (
        <View style={styles.bodyCenter}>
          <Text
            style={[
              styles.workoutInProgressTitle,
              { color: isDark ? "#fff" : "#000" },
            ]}
          >
            Workout in Progress
          </Text>

          <View style={styles.timerContainer}>
            <Image
              source={stopwatch}
              style={[
                styles.timerIcon,
                { tintColor: isDark ? "#fff" : "#000" },
              ]}
            />
            <Text
              style={[styles.timerText, { color: isDark ? "#fff" : "#000" }]}
            >
              {formatTime(seconds)}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: isDark ? "#fff" : "#000" }]}
              >
                {exercises.length}
              </Text>
              <Text
                style={[styles.statLabel, { color: isDark ? "#999" : "#666" }]}
              >
                Exercises
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: isDark ? "#fff" : "#000" }]}
              >
                {exercises.reduce(
                  (sum, ex) =>
                    sum + ex.sets.filter((s) => s.reps && s.weight).length,
                  0,
                )}
              </Text>
              <Text
                style={[styles.statLabel, { color: isDark ? "#999" : "#666" }]}
              >
                Sets
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.instructionText,
              { color: isDark ? "#999" : "#666" },
            ]}
          >
            {running ? "Tap the mini player below to continue" : "Timer paused"}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => navigation.navigate("WorkoutSummary")}
          >
            <Text style={styles.primaryButtonText}>Continue Workout</Text>
            <Text style={styles.primaryButtonArrow}>→</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bodyCenter}>
          <Text
            style={[
              styles.motivationalHeading,
              { color: isDark ? "#fff" : "#000" },
            ]}
          >
            Ready to sweat?
          </Text>
          <Text
            style={[
              styles.motivationalSubtext,
              { color: isDark ? "#999" : "#666" },
            ]}
          >
            You're on a roll! Keep the momentum going.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryButton, styles.startButton]}
            onPress={handleStartPress}
          >
            <Text style={[styles.primaryButtonPlay, styles.startButtonPlay]}>
              ▶
            </Text>
            <Text style={[styles.primaryButtonText, styles.startButtonText]}>
              Start Workout
            </Text>
          </TouchableOpacity>

          <TodaysRoutines />
        </View>
      )}

      <StartCountdownOverlay
        visible={isCountdownVisible}
        countdownValue={countdownValue}
        isDark={isDark}
        onCancel={cancelCountdown}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  newContainer: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 24,
  },

  // ── Header (always visible) ──────────────────────────
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  // Streak
  streakContainer: {
    alignItems: "flex-start",
  },

  streakShadowLayer1: {
    borderRadius: 20,
    alignItems: "flex-start",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  streakShadowLayer2: {
    borderRadius: 20,
    alignItems: "flex-start",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  fireIcon: {
    fontSize: 32,
    marginRight: 4,
  },

  streakNumber: {
    fontSize: 30,
    fontWeight: "800",
  },

  streakLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Action buttons (Exercises + Routines)
  headerActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },

  actionItem: {
    alignItems: "center",
  },

  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  exercisesIcon: {
    fontSize: 22,
  },

  checkIcon: {
    fontSize: 24,
    fontWeight: "700",
  },

  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },

  // ── Body (conditional) ───────────────────────────────
  bodyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: -80,
  },

  // Default state
  motivationalHeading: {
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },

  motivationalSubtext: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 22,
  },
  // Workout in progress state
  workoutInProgressTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 30,
  },

  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },

  timerIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },

  timerText: {
    fontSize: 48,
    fontWeight: "700",
  },

  statsContainer: {
    flexDirection: "row",
    gap: 60,
    marginBottom: 30,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  instructionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },

  // Shared primary rectangle button
  primaryButton: {
    width: 280,
    maxWidth: "90%",
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },

  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: "#fff",
  },

  primaryButtonArrow: {
    fontSize: 17,
    opacity: 0.8,
    color: "#fff",
  },

  primaryButtonPlay: {
    fontSize: 18,
    color: "#fff",
  },

  startButton: {
    width: "100%",
    maxWidth: undefined,
    height: 64,
    borderRadius: 16,
    gap: 12,
  },

  startButtonText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  startButtonPlay: {
    fontSize: 24,
  },
});
