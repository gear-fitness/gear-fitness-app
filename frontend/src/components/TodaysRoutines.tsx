import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect, useNavigation, useTheme } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import { getTodaysRoutines } from "../api/routineService";
import { Routine } from "../api/types";
import { useWorkoutTimer } from "../context/WorkoutContext";

export function TodaysRoutines() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const isDark = useColorScheme() === "dark";
  const { loadFromRoutine } = useWorkoutTimer();
  const [todaysRoutines, setTodaysRoutines] = useState<Routine[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchTodaysRoutines = async () => {
        try {
          const routines = await getTodaysRoutines();
          setTodaysRoutines(routines.slice(0, 3));
        } catch {
          setTodaysRoutines([]);
        }
      };
      fetchTodaysRoutines();
    }, []),
  );

  const handleQuickStartRoutine = async (routine: Routine) => {
    if (!routine.exercises.length) return;
    try {
      await loadFromRoutine(
        routine.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.exerciseName,
        })),
      );
      navigation.navigate("WorkoutSummary");
    } catch {
      // Ignore and keep user on current screen.
    }
  };

  return (
    <View style={styles.todaySection}>
      <Text
        style={[
          styles.todaySectionTitle,
          { color: isDark ? "#999" : "#666" },
        ]}
      >
        TODAY'S ROUTINES
      </Text>
      {todaysRoutines.length === 0 ? (
        <Text
          style={[
            styles.emptyTodayText,
            { color: isDark ? "#999" : "#666" },
          ]}
        >
          No routines scheduled for today.
        </Text>
      ) : (
        todaysRoutines.map((routine) => (
          <View
            key={routine.routineId}
            style={[
              styles.todayCard,
              { backgroundColor: isDark ? colors.card : "#F2F2F7" },
            ]}
          >
            <TouchableOpacity
              style={styles.todayCardLeft}
              onPress={() =>
                navigation.navigate("RoutineDetail", {
                  routineId: routine.routineId,
                })
              }
            >
              <Text
                style={[
                  styles.todayRoutineName,
                  { color: isDark ? "#fff" : "#000" },
                ]}
              >
                {routine.name}
              </Text>
              <Text
                style={[
                  styles.todayRoutineCount,
                  { color: isDark ? "#999" : "#666" },
                ]}
              >
                {routine.exercises.length} exercises
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickStartButton}
              onPress={() => handleQuickStartRoutine(routine)}
            >
              <Text style={styles.quickStartText}>▶</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  todaySection: {
    width: "100%",
    marginTop: 32,
    gap: 10,
  },
  todaySectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  emptyTodayText: {
    fontSize: 14,
  },
  todayCard: {
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  todayCardLeft: {
    flex: 1,
  },
  todayRoutineName: {
    fontSize: 15,
    fontWeight: "700",
  },
  todayRoutineCount: {
    marginTop: 2,
    fontSize: 12,
  },
  quickStartButton: {
    backgroundColor: "#007AFF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  quickStartText: {
    color: "#fff",
    fontSize: 18,
  },
});
