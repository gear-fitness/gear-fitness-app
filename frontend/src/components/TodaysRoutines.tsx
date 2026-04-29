import React, { useCallback, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import Svg, { Path } from "react-native-svg";
import { getTodaysRoutines } from "../api/routineService";
import { Routine } from "../api/types";
import { useWorkoutTimer } from "../context/WorkoutContext";
import { useStartCountdown } from "../hooks/useStartCountdown";
import { StartCountdownOverlay } from "./StartCountdownOverlay";

export function TodaysRoutines() {
  const navigation = useNavigation();
  const isDark = useColorScheme() === "dark";
  const { loadFromRoutine } = useWorkoutTimer();
  const [todaysRoutines, setTodaysRoutines] = useState<Routine[]>([]);
  const pendingRoutineRef = useRef<Routine | null>(null);

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

  const handleQuickStartRoutine = useCallback(
    async (routine: Routine) => {
      if (!routine.exercises.length) return;
      try {
        await loadFromRoutine(
          routine.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            name: ex.exerciseName,
          })),
        );
        (navigation as any).navigate("WorkoutFlow", {
          screen: "WorkoutSummary",
        });
      } catch {
        // Ignore and keep user on current screen.
      }
    },
    [loadFromRoutine, navigation],
  );

  const {
    isCountdownVisible,
    countdownValue,
    startCountdown,
    cancelCountdown,
  } = useStartCountdown({
    onComplete: async () => {
      const pendingRoutine = pendingRoutineRef.current;
      pendingRoutineRef.current = null;
      if (!pendingRoutine) return;
      await handleQuickStartRoutine(pendingRoutine);
    },
  });

  const handleQuickStartPress = (routine: Routine) => {
    if (!routine.exercises.length) return;
    pendingRoutineRef.current = routine;
    startCountdown();
  };

  const t = isDark
    ? {
        surface: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        border: "rgba(255,255,255,0.08)",
      }
    : {
        surface: "#fff",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        textFaint: "rgba(0,0,0,0.4)",
        border: "rgba(0,0,0,0.08)",
      };

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: t.textMuted }]}>
          TODAY'S ROUTINES
        </Text>
        <Text style={[styles.labelCount, { color: t.textMuted }]}>
          {todaysRoutines.length}{" "}
          {todaysRoutines.length === 1 ? "scheduled" : "scheduled"}
        </Text>
      </View>

      {todaysRoutines.length === 0 ? (
        <Text style={[styles.emptyText, { color: t.textFaint }]}>
          No routines scheduled for today.
        </Text>
      ) : (
        <View style={styles.list}>
          {todaysRoutines.map((routine) => (
            <View
              key={routine.routineId}
              style={[
                styles.card,
                { backgroundColor: t.surface, borderColor: t.border },
              ]}
            >
              <TouchableOpacity
                style={styles.cardLeft}
                activeOpacity={0.7}
                onPress={() =>
                  (navigation as any).navigate("RoutineDetail", {
                    routineId: routine.routineId,
                  })
                }
              >
                <Text style={[styles.routineName, { color: t.text }]}>
                  {routine.name}
                </Text>
                <Text style={[styles.routineCount, { color: t.textFaint }]}>
                  {routine.exercises.length} exercises
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.startAffordance}
                activeOpacity={0.7}
                onPress={() => handleQuickStartPress(routine)}
              >
                <Text style={[styles.startLabel, { color: t.textMuted }]}>
                  START
                </Text>
                <Svg width={10} height={12} viewBox="0 0 10 12" fill="none">
                  <Path
                    d="M3 2l5 4-5 4"
                    stroke={t.text}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <StartCountdownOverlay
        visible={isCountdownVisible}
        countdownValue={countdownValue}
        isDark={isDark}
        onCancel={cancelCountdown}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: "100%",
    marginTop: 20,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
    paddingTop: 6,
    paddingBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  labelCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 14,
    paddingHorizontal: 2,
  },
  list: {
    gap: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardLeft: {
    flex: 1,
  },
  routineName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  routineCount: {
    marginTop: 2,
    fontSize: 12,
  },
  startAffordance: {
    minWidth: 44,
    height: 34,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  startLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.4,
  },
});
