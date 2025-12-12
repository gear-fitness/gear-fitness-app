import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useColorScheme } from "react-native";

import stopwatch from "../assets/stopwatch.png";
import { useWorkoutTimer } from "../context/WorkoutContext";

interface MiniPlayerProps {
  onTap: () => void;
  isVisible: boolean;
}

export function MiniPlayer({ onTap, isVisible }: MiniPlayerProps) {
  const { seconds, running, start, pause, exercises, currentExerciseId } =
    useWorkoutTimer();
  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "#1c1c1e" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#999" : "#666",
  };

  // Find current exercise
  const currentExercise = exercises.find(
    (ex) => ex.workoutExerciseId === currentExerciseId
  );

  const formatTime = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0"
    )}`;

  // Get last valid set info if we have an exercise
  const validSets = currentExercise?.sets.filter(
    (s) => s.reps && s.weight
  ) || [];
  const lastSet = validSets[validSets.length - 1];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onTap}
      disabled={!isVisible} // Disable tap when no workout active
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
      ]}
    >
      <View style={styles.leftContent}>
        {currentExercise ? (
          <>
            <Text
              style={[styles.exerciseName, { color: colors.text }]}
              numberOfLines={1}
            >
              {currentExercise.name}
            </Text>
            {lastSet ? (
              <Text style={[styles.setInfo, { color: colors.subtle }]}>
                Set {validSets.length}: {lastSet.reps} reps × {lastSet.weight} lb
              </Text>
            ) : (
              <Text style={[styles.setInfo, { color: colors.subtle }]}>
                No sets yet
              </Text>
            )}
          </>
        ) : isVisible ? (
          <Text style={[styles.exerciseName, { color: colors.text }]}>
            Workout in Progress
          </Text>
        ) : (
          <View style={{ height: 40 }} />
        )}
      </View>

      <View style={styles.rightContent}>
        <Image
          source={stopwatch}
          style={[styles.timerIcon, { tintColor: colors.text }]}
        />
        <Text style={[styles.timerText, { color: colors.text }]}>
          {formatTime(seconds)}
        </Text>

        {isVisible && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              running ? pause() : start();
            }}
            style={[styles.playPauseButton, { backgroundColor: "#007AFF" }]}
          >
            <Text style={styles.playPauseText}>{running ? "⏸" : "▶"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  leftContent: {
    flex: 1,
    marginRight: 12,
  },

  exerciseName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  setInfo: {
    fontSize: 14,
    fontWeight: "500",
  },

  rightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  timerIcon: {
    width: 20,
    height: 20,
  },

  timerText: {
    fontSize: 16,
    fontWeight: "600",
  },

  playPauseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },

  playPauseText: {
    color: "#fff",
    fontSize: 14,
  },
});
