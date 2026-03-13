import React, { useState, useLayoutEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getRoutineDetail, deleteRoutine } from "../../api/routineService";
import { Routine } from "../../api/types";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { BackButton } from "../../components/BackButton";

type RootStackParamList = {
  RoutineDetail: { routineId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "RoutineDetail">;

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export function RoutineDetail({ route }: Props) {
  const { routineId } = route.params;
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { loadFromRoutine } = useWorkoutTimer();

  const colors = {
    bg: isDark ? "#000" : "#fff",
    card: isDark ? "#1C1C1E" : "#F2F2F7",
    cardBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    text: isDark ? "#fff" : "#000",
    secondary: isDark ? "#999" : "#666",
    separator: isDark ? "#2C2C2E" : "#E5E5EA",
    pill: isDark ? "#2C2C2E" : "#E5E5EA",
    pillText: isDark ? "#ccc" : "#555",
    positionBg: isDark ? "#3A3A3C" : "#E5E5EA",
  };

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "",
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerLeft: () => (
        <BackButton onPress={() => navigation.goBack()} color={colors.text} />
      ),
    });
  }, [navigation, colors]);

  useFocusEffect(
    useCallback(() => {
      const fetch = async () => {
        try {
          const data = await getRoutineDetail(routineId);
          setRoutine(data);
        } catch (err: any) {
          setError(err.message ?? "Failed to load routine");
        } finally {
          setLoading(false);
        }
      };
      fetch();
    }, [routineId])
  );

  const handleStartWorkout = async () => {
    if (!routine || routine.exercises.length === 0) {
      Alert.alert(
        "No exercises",
        "This routine has no exercises to start a workout with."
      );
      return;
    }
    setStarting(true);
    try {
      await loadFromRoutine(
        routine.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.exerciseName,
        }))
      );
      navigation.navigate("WorkoutSummary");
    } finally {
      setStarting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Routine",
      `Are you sure you want to delete "${routine?.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteRoutine(routineId);
              navigation.goBack();
            } catch {
              Alert.alert("Error", "Failed to delete routine. Please try again.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !routine) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error ?? "Routine not found"}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Routine name */}
        <View style={styles.titleRow}>
          <Text style={[styles.routineName, { color: colors.text }]}>
            {routine.name}
          </Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => routine && navigation.navigate("EditRoutine", { routine })}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Scheduled day pills */}
        {routine.scheduledDays.length > 0 && (
          <View style={styles.daysRow}>
            {routine.scheduledDays.map((day) => (
              <View
                key={day}
                style={[styles.dayPill, { backgroundColor: colors.pill }]}
              >
                <Text style={[styles.dayPillText, { color: colors.pillText }]}>
                  {DAY_SHORT[day] ?? day}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Exercise count */}
        <Text style={[styles.exerciseCount, { color: colors.secondary }]}>
          {routine.exercises.length}{" "}
          {routine.exercises.length === 1 ? "exercise" : "exercises"}
        </Text>

        {/* Exercise list card */}
        <View
          style={[
            styles.exerciseCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {routine.exercises.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondary }]}>
              No exercises in this routine yet.
            </Text>
          ) : (
            routine.exercises.map((ex, index) => (
              <View key={ex.routineExerciseId}>
                <View style={styles.exerciseRow}>
                  <View
                    style={[
                      styles.positionBadge,
                      { backgroundColor: colors.positionBg },
                    ]}
                  >
                    <Text
                      style={[styles.positionText, { color: colors.secondary }]}
                    >
                      {ex.position}
                    </Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text
                      style={[styles.exerciseName, { color: colors.text }]}
                    >
                      {ex.exerciseName}
                    </Text>
                    <Text
                      style={[
                        styles.exerciseBodyPart,
                        { color: colors.secondary },
                      ]}
                    >
                      {ex.bodyPart.charAt(0).toUpperCase() +
                        ex.bodyPart.slice(1).toLowerCase()}
                    </Text>
                  </View>
                </View>
                {index < routine.exercises.length - 1 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: colors.separator },
                    ]}
                  />
                )}
              </View>
            ))
          )}
        </View>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={styles.deleteText}>
            {deleting ? "Deleting..." : "Delete Routine"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Start Workout button */}
      <View
        style={[
          styles.stickyBottom,
          {
            backgroundColor: colors.bg,
            borderTopColor: colors.separator,
          },
        ]}
      >
        <View style={styles.startShadowLayer}>
          <TouchableOpacity
            style={[styles.startButton, starting && styles.disabledButton]}
            onPress={handleStartWorkout}
            disabled={starting}
            activeOpacity={0.8}
          >
            {starting ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <>
                <Text style={[styles.startIcon, { color: isDark ? "#fff" : "#000" }]}>▶</Text>
                <Text style={[styles.startButtonText, { color: isDark ? "#fff" : "#000" }]}>
                  Start Workout
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },
  routineName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  editButton: {
    borderRadius: 999,
    backgroundColor: "#007AFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dayPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  exerciseCount: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  exerciseCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  positionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  exerciseBodyPart: {
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  emptyText: {
    textAlign: "center",
    padding: 24,
    fontSize: 15,
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  deleteText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    padding: 20,
  },
  stickyBottom: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  startShadowLayer: {
    borderRadius: 999,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  startButton: {
    height: 60,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
    gap: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  startIcon: {
    fontSize: 22,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
