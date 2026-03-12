import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Routine, Workout } from "../api/types";
import {
  createRoutine,
  createRoutineFromWorkout,
} from "../api/routineService";
import { getAllExercises } from "../api/exerciseService";
import { getUserWorkouts } from "../api/workoutService";
import { useAuth } from "../context/AuthContext";
import { parseLocalDate } from "../utils/date";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_FULL: Record<string, string> = {
  MON: "MONDAY",
  TUE: "TUESDAY",
  WED: "WEDNESDAY",
  THU: "THURSDAY",
  FRI: "FRIDAY",
  SAT: "SATURDAY",
  SUN: "SUNDAY",
};

type SourceMode = "choose" | "scratch" | "workout";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: (routine: Routine) => void;
  prefilledWorkoutId?: string;
};

export function CreateRoutineModal({
  visible,
  onClose,
  onCreated,
  prefilledWorkoutId,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const colors = {
    bg: isDark ? "#1C1C1E" : "#F2F2F7",
    surface: isDark ? "#2C2C2E" : "#fff",
    text: isDark ? "#fff" : "#000",
    secondary: isDark ? "#999" : "#666",
    border: isDark ? "#3A3A3C" : "#D1D1D6",
    inputBg: isDark ? "#3A3A3C" : "#fff",
    pill: isDark ? "#3A3A3C" : "#E5E5EA",
    pillActive: "#007AFF",
    pillActiveText: "#fff",
    pillText: isDark ? "#fff" : "#000",
    overlay: "rgba(0,0,0,0.5)",
    selected: isDark ? "rgba(0,122,255,0.2)" : "rgba(0,122,255,0.1)",
    selectedBorder: "#007AFF",
  };

  const [step, setStep] = useState<"details" | "source" | "scratch" | "workout">("details");
  const [name, setName] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // From-scratch state
  const [exercises, setExercises] = useState<any[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

  // From-workout state
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    prefilledWorkoutId ?? null
  );

  const [submitting, setSubmitting] = useState(false);

  const resetState = useCallback(() => {
    setStep("details");
    setName("");
    setSelectedDays([]);
    setSearchQuery("");
    setSelectedExerciseIds([]);
    setSelectedWorkoutId(prefilledWorkoutId ?? null);
    setWorkouts([]);
    setExercises([]);
  }, [prefilledWorkoutId]);

  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [visible, resetState]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const loadExercises = async () => {
    if (exercises.length > 0) return;
    setExercisesLoading(true);
    try {
      const data = await getAllExercises();
      setExercises(data);
    } catch (err) {
      console.error("Failed to load exercises:", err);
    } finally {
      setExercisesLoading(false);
    }
  };

  const loadWorkouts = async () => {
    if (!user) return;
    if (workouts.length > 0) return;
    setWorkoutsLoading(true);
    try {
      const data = await getUserWorkouts(user.userId);
      setWorkouts(data);
    } catch (err) {
      console.error("Failed to load workouts:", err);
    } finally {
      setWorkoutsLoading(false);
    }
  };

  const handleNextFromDetails = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a name for your routine.");
      return;
    }
    if (prefilledWorkoutId) {
      handleSubmitFromWorkout(prefilledWorkoutId);
    } else {
      setStep("source");
    }
  };

  const handleChooseScratch = () => {
    setStep("scratch");
    loadExercises();
  };

  const handleChooseWorkout = () => {
    setStep("workout");
    loadWorkouts();
  };

  const toggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleSubmitFromScratch = async () => {
    if (selectedExerciseIds.length === 0) {
      Alert.alert(
        "No exercises",
        "Please select at least one exercise for your routine."
      );
      return;
    }
    setSubmitting(true);
    try {
      const days = selectedDays.map((d) => DAY_FULL[d]);
      const routine = await createRoutine(name.trim(), days, selectedExerciseIds);
      onCreated(routine);
    } catch (err) {
      Alert.alert("Error", "Failed to create routine. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFromWorkout = async (workoutId: string) => {
    setSubmitting(true);
    try {
      const days = selectedDays.map((d) => DAY_FULL[d]);
      const routine = await createRoutineFromWorkout(workoutId, name.trim(), days);
      onCreated(routine);
    } catch (err) {
      Alert.alert("Error", "Failed to create routine. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      ex.name.toLowerCase().includes(q) ||
      ex.bodyPart.toLowerCase().includes(q)
    );
  });

  const renderHeader = (title: string, onBack?: () => void) => (
    <View style={styles.sheetHeader}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backText, { color: "#007AFF" }]}>← Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={[styles.closeText, { color: colors.secondary }]}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDetailsStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.stepContent}>
        {renderHeader("New Routine")}

        <Text style={[styles.label, { color: colors.secondary }]}>
          ROUTINE NAME
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="e.g. Push Day"
          placeholderTextColor={colors.secondary}
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          autoFocus
        />

        <Text style={[styles.label, { color: colors.secondary }]}>
          SCHEDULED DAYS (OPTIONAL)
        </Text>
        <View style={styles.daysRow}>
          {DAYS.map((day) => {
            const active = selectedDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: active ? colors.pillActive : colors.pill,
                  },
                ]}
                onPress={() => toggleDay(day)}
              >
                <Text
                  style={[
                    styles.dayPillText,
                    {
                      color: active ? colors.pillActiveText : colors.pillText,
                    },
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.disabledButton]}
          onPress={handleNextFromDetails}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {prefilledWorkoutId ? "Save Routine" : "Continue →"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderSourceStep = () => (
    <ScrollView contentContainerStyle={styles.stepContent}>
      {renderHeader("Add Exercises", () => setStep("details"))}

      <Text style={[styles.sourceSubtitle, { color: colors.secondary }]}>
        How would you like to build this routine?
      </Text>

      <TouchableOpacity
        style={[
          styles.sourceCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={handleChooseScratch}
      >
        <Text style={styles.sourceCardIcon}>✏️</Text>
        <View style={styles.sourceCardText}>
          <Text style={[styles.sourceCardTitle, { color: colors.text }]}>
            Build from scratch
          </Text>
          <Text style={[styles.sourceCardSubtitle, { color: colors.secondary }]}>
            Search and add exercises manually
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.secondary }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.sourceCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={handleChooseWorkout}
      >
        <Text style={styles.sourceCardIcon}>📋</Text>
        <View style={styles.sourceCardText}>
          <Text style={[styles.sourceCardTitle, { color: colors.text }]}>
            From a past workout
          </Text>
          <Text style={[styles.sourceCardSubtitle, { color: colors.secondary }]}>
            Copy exercises from a completed workout
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.secondary }]}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderScratchStep = () => (
    <View style={{ flex: 1 }}>
      {renderHeader("Select Exercises", () => setStep("source"))}

      <View style={styles.stepContent}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Search exercises..."
          placeholderTextColor={colors.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {selectedExerciseIds.length > 0 && (
          <Text style={[styles.selectedCount, { color: "#007AFF" }]}>
            {selectedExerciseIds.length} selected
          </Text>
        )}
      </View>

      {exercisesLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.exerciseId}
          renderItem={({ item }) => {
            const selected = selectedExerciseIds.includes(item.exerciseId);
            return (
              <TouchableOpacity
                style={[
                  styles.exerciseRow,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: selected
                      ? colors.selected
                      : "transparent",
                  },
                ]}
                onPress={() => toggleExercise(item.exerciseId)}
              >
                <View style={styles.exerciseRowLeft}>
                  <Text
                    style={[styles.exerciseName, { color: colors.text }]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.exerciseBodyPart, { color: colors.secondary }]}
                  >
                    {item.bodyPart}
                  </Text>
                </View>
                {selected && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <View
        style={[
          styles.stickyBottom,
          { backgroundColor: colors.bg, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.primaryButton,
            submitting && styles.disabledButton,
          ]}
          onPress={handleSubmitFromScratch}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Create Routine
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWorkoutStep = () => (
    <View style={{ flex: 1 }}>
      {renderHeader("Pick a Workout", () => setStep("source"))}

      {workoutsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#007AFF" />
        </View>
      ) : workouts.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            No past workouts found
          </Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.workoutId}
          renderItem={({ item }) => {
            const selected = selectedWorkoutId === item.workoutId;
            return (
              <TouchableOpacity
                style={[
                  styles.exerciseRow,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: selected
                      ? colors.selected
                      : "transparent",
                  },
                ]}
                onPress={() => setSelectedWorkoutId(item.workoutId)}
              >
                <View style={styles.exerciseRowLeft}>
                  <Text
                    style={[styles.exerciseName, { color: colors.text }]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.exerciseBodyPart, { color: colors.secondary }]}
                  >
                    {parseLocalDate(item.datePerformed).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </Text>
                </View>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <View
        style={[
          styles.stickyBottom,
          { backgroundColor: colors.bg, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!selectedWorkoutId || submitting) && styles.disabledButton,
          ]}
          onPress={() =>
            selectedWorkoutId && handleSubmitFromWorkout(selectedWorkoutId)
          }
          disabled={!selectedWorkoutId || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Routine</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.sheet, { backgroundColor: colors.bg }]}>
        {step === "details" && renderDetailsStep()}
        {step === "source" && renderSourceStep()}
        {step === "scratch" && renderScratchStep()}
        {step === "workout" && renderWorkoutStep()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 80,
  },
  backText: {
    fontSize: 16,
    fontWeight: "500",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  closeButton: {
    width: 80,
    alignItems: "flex-end",
  },
  closeText: {
    fontSize: 18,
  },
  stepContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 32,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dayPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  sourceSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  sourceCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sourceCardIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  sourceCardText: {
    flex: 1,
  },
  sourceCardTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 2,
  },
  sourceCardSubtitle: {
    fontSize: 13,
  },
  chevron: {
    fontSize: 22,
    fontWeight: "300",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exerciseRowLeft: {
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
  checkmark: {
    color: "#007AFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  selectedCount: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 4,
  },
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
