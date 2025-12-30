import { Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Image,
} from "react-native";
import { useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useColorScheme } from "react-native";

import stopwatch from "../../assets/stopwatch.png";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { useTrackTab } from "../../hooks/useTrackTab";

export function Workout() {
  useTrackTab("Workouts");

  const navigation = useNavigation();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const { playerVisible, seconds, running, exercises } = useWorkoutTimer();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Reset animations when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }, [fadeAnim, scaleAnim])
  );

  const handleStartPress = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate("ExerciseSelect");
    });
  };

  const formatTime = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0"
    )}`;

  // If workout is in progress, show workout status
  if (playerVisible) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? "black" : "white" },
        ]}
      >
        <View style={styles.workoutInProgressContainer}>
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
                  0
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
            style={[styles.expandButton, { backgroundColor: "#007AFF" }]}
            onPress={() => navigation.navigate("WorkoutSummary")}
          >
            <Text style={styles.expandButtonText}>Continue Workout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Default state: Show START button
  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? "black" : "white" },
      ]}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity style={styles.startButton} onPress={handleStartPress}>
          <Text style={styles.startText}>START</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Blue circle
  startButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#007AFF", // Blue
    justifyContent: "center",
    alignItems: "center",
  },

  startText: {
    color: "white",
    fontSize: 32,
    fontWeight: "800",
  },

  // Workout in progress styles
  workoutInProgressContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },

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

  expandButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },

  expandButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
