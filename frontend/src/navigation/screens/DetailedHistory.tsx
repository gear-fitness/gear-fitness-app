import {
  Text,
  StyleSheet,
  View,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getWorkoutDetails } from "../../api/workoutService";
import { WorkoutDetail } from "../../api/types";
import { parseLocalDate } from "../../utils/date";
import { useTrackTab } from "../../hooks/useTrackTab";

type RootStackParamList = {
  DetailedHistory: {
    workoutId: string;
    caption?: string;
    workoutName?: string;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, "DetailedHistory">;

export function DetailedHistory({ route }: Props) {
  useTrackTab("DetailedHistory");

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { workoutId, caption, workoutName } = route.params;

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        const data = await getWorkoutDetails(workoutId);
        setWorkout(data);
        setLoading(false);
      } catch (err: any) {
        console.error("Error loading workout details:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchWorkout();
  }, [workoutId]);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: isDark ? "#121212" : "#fff" },
        ]}
      >
        <ActivityIndicator size="large" color="#1877F2" />
        <Text style={[styles.loadingText, { color: isDark ? "#fff" : "#000" }]}>
          Loading workout...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: isDark ? "#121212" : "#fff" },
        ]}
      >
        <Text style={[styles.errorText, { color: isDark ? "#fff" : "#000" }]}>
          Error: {error}
        </Text>
        <Text
          style={[styles.errorSubtext, { color: isDark ? "#aaa" : "#666" }]}
        >
          Workout ID: {workoutId}
        </Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: isDark ? "#121212" : "#fff" },
        ]}
      >
        <Text style={[styles.errorText, { color: isDark ? "#fff" : "#000" }]}>
          Workout not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#fff" },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.workoutName, { color: isDark ? "#fff" : "#000" }]}>
          {workout.name}
        </Text>
        <Text style={[styles.workoutDate, { color: isDark ? "#aaa" : "#666" }]}>
          {parseLocalDate(workout.datePerformed).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {workout.durationMin != null && workout.durationMin > 0 && ` • ${workout.durationMin} min`}
        </Text>
        {workout.bodyTag && (
          <Text
            style={[styles.bodyTag, { color: isDark ? "#1877F2" : "#1877F2" }]}
          >
            {workout.bodyTag}
          </Text>
        )}
      </View>

      {/* Caption */}
      {caption && (
        <View
          style={[
            styles.captionContainer,
            {
              backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9",
              borderTopColor: isDark ? "#333" : "#e0e0e0",
            },
          ]}
        >
          <Text style={[styles.captionText, { color: isDark ? "#fff" : "#000" }]}>
            {caption}
          </Text>
        </View>
      )}

      {/* Exercises */}
      {workout.exercises && workout.exercises.length > 0 ? (
        workout.exercises.map((exercise) => (
          <View
            key={exercise.workoutExerciseId}
            style={[
              styles.exerciseCard,
              {
                backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9",
                borderColor: isDark ? "#333" : "#e0e0e0",
              },
            ]}
          >
            <Text
              style={[styles.exerciseName, { color: isDark ? "#fff" : "#000" }]}
            >
              {exercise.exerciseName}
            </Text>
            <Text
              style={[styles.bodyPart, { color: isDark ? "#aaa" : "#666" }]}
            >
              {exercise.bodyPart}
            </Text>
            {exercise.note && (
              <Text style={[styles.note, { color: isDark ? "#bbb" : "#777" }]}>
                Note: {exercise.note}
              </Text>
            )}

            {/* Sets */}
            <View style={styles.setsContainer}>
              {exercise.sets && exercise.sets.length > 0 ? (
                exercise.sets.map((set) => (
                  <View
                    key={set.workoutSetId}
                    style={[
                      styles.setRow,
                      {
                        backgroundColor: isDark ? "#2a2a2a" : "#fff",
                        borderColor: isDark ? "#444" : "#ddd",
                      },
                      set.isPr && styles.prSet,
                    ]}
                  >
                    <Text
                      style={[
                        styles.setText,
                        { color: isDark ? "#fff" : "#000" },
                      ]}
                    >
                      Set {set.setNumber}
                    </Text>
                    <Text
                      style={[
                        styles.setText,
                        { color: isDark ? "#fff" : "#000" },
                      ]}
                    >
                      {set.reps} reps
                      {set.weightLbs !== null && ` @ ${set.weightLbs} lbs`}
                    </Text>
                    {set.isPr && <Text style={styles.prBadge}>PR 🏆</Text>}
                  </View>
                ))
              ) : (
                <Text
                  style={[
                    styles.noSetsText,
                    { color: isDark ? "#aaa" : "#666" },
                  ]}
                >
                  No sets recorded
                </Text>
              )}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.centerContent}>
          <Text
            style={[
              styles.noExercisesText,
              { color: isDark ? "#aaa" : "#666" },
            ]}
          >
            No exercises recorded for this workout
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  workoutName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  workoutDate: {
    fontSize: 16,
    marginBottom: 4,
  },
  bodyTag: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  captionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  captionText: {
    fontSize: 15,
    lineHeight: 20,
  },
  exerciseCard: {
    margin: 15,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  bodyPart: {
    fontSize: 14,
    marginBottom: 8,
  },
  note: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 12,
  },
  setsContainer: {
    marginTop: 10,
  },
  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  prSet: {
    borderColor: "#FFD700",
    borderWidth: 2,
  },
  setText: {
    fontSize: 16,
  },
  prBadge: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  noExercisesText: {
    fontSize: 16,
    fontStyle: "italic",
  },
  noSetsText: {
    fontSize: 14,
    fontStyle: "italic",
  },
});
