import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useColorScheme } from "react-native";
import { SymbolView } from "expo-symbols";

import stopwatch from "../assets/stopwatch.png";
import { useWorkoutTimer } from "../context/WorkoutContext";
import { useUnitPreference } from "../context/UnitPreferenceContext";
import { toDisplayWeight } from "../utils/weight";
import { GlassView } from "expo-glass-effect";

interface MiniPlayerProps {
  onTap: () => void;
  isVisible: boolean;
}

export function MiniPlayer({ onTap, isVisible }: MiniPlayerProps) {
  const {
    seconds,
    running,
    start,
    pause,
    exercises,
    currentExerciseId,
    currentCardioId,
    cardioEntries,
  } = useWorkoutTimer();
  const { weightUnit: globalUnit } = useUnitPreference();
  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "rgba(28, 28, 30, 0.8)" : "#fcfcfcc8",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#999" : "#666",
  };

  // Find current exercise
  const currentExercise = exercises.find(
    (ex) => ex.workoutExerciseId === currentExerciseId,
  );
  // A cardio entry takes priority when it's the current player item.
  const currentCardio = cardioEntries.find(
    (c) => c.workoutCardioId === currentCardioId,
  );
  const weightUnit = currentExercise?.weightUnit ?? globalUnit;

  const formatTime = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0",
    )}`;

  // Get last valid set info if we have an exercise
  const validSets =
    currentExercise?.sets.filter((s) => s.reps && s.weight) || [];
  const lastSet = validSets[validSets.length - 1];

  // Cardio subtitle: duration plus any logged distance/calories.
  const cardioSubtitle = currentCardio
    ? [
        formatTime(currentCardio.durationSeconds),
        currentCardio.distance ? `${currentCardio.distance} mi` : null,
        currentCardio.calories ? `${currentCardio.calories} cal` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: 16,
      height: 60,
      borderRadius: 30,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 2,
      borderColor: "#cacaca38",
      overflow: "hidden", // important for the blur clipping
    },

    leftContent: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
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

  return (
    <GlassView
      style={[styles.container, { backgroundColor: colors.bg }]}
      glassEffectStyle={"clear"}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onTap}
        disabled={!isVisible}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            elevation: 8,
          },
        ]}
      >
        <View style={styles.leftContent}>
          {currentCardio ? (
            <>
              <Text
                style={[styles.exerciseName, { color: colors.text }]}
                numberOfLines={1}
              >
                {currentCardio.activityType}
              </Text>
              <Text
                style={[styles.setInfo, { color: colors.subtle }]}
                numberOfLines={1}
              >
                {cardioSubtitle}
              </Text>
            </>
          ) : currentExercise ? (
            <>
              <Text
                style={[styles.exerciseName, { color: colors.text }]}
                numberOfLines={1}
              >
                {currentExercise.name}
              </Text>
              {lastSet ? (
                <Text style={[styles.setInfo, { color: colors.subtle }]}>
                  Set {validSets.length}: {lastSet.reps} reps ×{" "}
                  {toDisplayWeight(Number(lastSet.weight) || 0, weightUnit)}{" "}
                  {weightUnit}
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
              style={styles.playPauseButton}
            >
              <SymbolView
                name={running ? "pause.fill" : "play.fill"}
                tintColor={isDark ? "#fff" : "#000"}
                size={14}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </GlassView>
  );
}
