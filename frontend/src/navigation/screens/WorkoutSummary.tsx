import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import React, { useState } from "react";

import stopwatch from "../../assets/stopwatch.png";

import { useWorkoutTimer } from "../../context/WorkoutContext";
import { useSwipeableDelete } from "../../hooks/useSwipeableDelete";

export function WorkoutSummary() {
  const isDark = useColorScheme() === "dark";
  const navigation = useNavigation<any>();

  const { seconds, running, start, pause, exercises, removeExercise } =
    useWorkoutTimer();

  // Track touch position for movement-based tap detection
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null
  );

  // Swipeable delete hook
  const { getSwipeableProps } = useSwipeableDelete({
    onDelete: (id) => removeExercise(id),
    deleteTitle: "Delete Exercise",
    deleteMessage: "Are you sure you want to remove this exercise?",
  });

  const formatTime = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0"
    )}`;

  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
    >
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={[styles.dateText, { color: isDark ? "#fff" : "#000" }]}>
          {today}
        </Text>

        <Text style={[styles.titleText, { color: isDark ? "#fff" : "#000" }]}>
          Workout
        </Text>

        <View style={styles.timerHeaderRight}>
          <Image
            source={stopwatch}
            style={[styles.headerIcon, { tintColor: isDark ? "#fff" : "#000" }]}
          />
          <Text
            style={[
              styles.headerTimerText,
              { color: isDark ? "#fff" : "#000" },
            ]}
          >
            {formatTime(seconds)}
          </Text>
        </View>
      </View>

      {/* LIST */}
      <View style={{ marginTop: 20 }}>
        {exercises.map((ex) => {
          const last =
            [...ex.sets]
              .reverse()
              .find((s) => s.reps !== "" && s.weight !== "") || null;

          return (
            <View key={ex.workoutExerciseId} style={styles.rowWrapper}>
              <Swipeable {...getSwipeableProps(ex.workoutExerciseId)}>
                <View
                  onTouchStart={(e) => {
                    setTouchStart({
                      x: e.nativeEvent.pageX,
                      y: e.nativeEvent.pageY,
                    });
                  }}
                  onTouchEnd={(e) => {
                    if (!touchStart) return;

                    const deltaX = Math.abs(e.nativeEvent.pageX - touchStart.x);
                    const deltaY = Math.abs(e.nativeEvent.pageY - touchStart.y);

                    // Only navigate if minimal movement (< 5px in any direction)
                    if (deltaX < 5 && deltaY < 5) {
                      navigation.replace("ExerciseDetail", { exercise: ex });
                    }

                    setTouchStart(null);
                  }}
                >
                  <View
                    style={[
                      styles.exerciseCard,
                      { backgroundColor: isDark ? "#1c1c1e" : "#f2f2f2" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.exerciseName,
                        { color: isDark ? "#fff" : "#000" },
                      ]}
                    >
                      {ex.name}
                    </Text>

                    {last ? (
                      <Text
                        style={{
                          color: isDark ? "#ccc" : "#555",
                          marginTop: 4,
                        }}
                      >
                        Last Set: {last.reps} reps × {last.weight} lb
                      </Text>
                    ) : (
                      <Text style={{ color: "#666", marginTop: 4 }}>
                        No sets yet
                      </Text>
                    )}
                  </View>
                </View>
              </Swipeable>
            </View>
          );
        })}
      </View>

      {/* FOOTER BUTTONS */}
      <View style={styles.bottomButtons}>
        {running ? (
          <>
            <TouchableOpacity
              style={[
                styles.pauseBtn,
                { backgroundColor: isDark ? "#333" : "#ddd" },
              ]}
              onPress={pause}
            >
              <Text
                style={[styles.btnText, { color: isDark ? "#fff" : "#000" }]}
              >
                Pause
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: "#1E90FF" }]}
              onPress={() => navigation.replace("ExerciseSelect")}
            >
              <Text style={[styles.btnText, { color: "#fff" }]}>
                Add Exercise
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.pauseBtn,
                { backgroundColor: isDark ? "#333" : "#ddd" },
              ]}
              onPress={start}
            >
              <Text
                style={[styles.btnText, { color: isDark ? "#fff" : "#000" }]}
              >
                Resume
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: "#FF3B30" }]}
              onPress={() => navigation.navigate("WorkoutComplete")}
            >
              <Text style={[styles.btnText, { color: "#fff" }]}>Finish</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dateText: { fontSize: 16, fontWeight: "600" },
  titleText: { fontSize: 26, fontWeight: "800", flex: 1, textAlign: "center" },

  timerHeaderRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerIcon: { width: 20, height: 20 },
  headerTimerText: { fontSize: 18, fontWeight: "600" },

  rowWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
  },

  exerciseCard: { padding: 18, borderRadius: 14 },
  exerciseName: { fontSize: 20, fontWeight: "700" },

  bottomButtons: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  pauseBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginRight: 10,
    alignItems: "center",
  },

  addBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginLeft: 10,
    alignItems: "center",
  },

  btnText: { fontWeight: "700", fontSize: 16 },
});
