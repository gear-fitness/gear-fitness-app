import React, { useState, useLayoutEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  createRoutine,
  createRoutineFromWorkout,
} from "../../api/routineService";
import { useAuth } from "../../context/AuthContext";
import { parseLocalDate } from "../../utils/date";
import { BackButton } from "../../components/BackButton";
import { DAYS, DAY_FULL } from "../../utils/days";
import { useThemeColors } from "../../hooks/useThemeColors";
import { useExerciseList } from "../../hooks/useExerciseList";
import { useUserWorkouts } from "../../hooks/useUserWorkouts";
import { renderBodyParts } from "../../utils/exerciseUtils";

type Step = "details" | "source" | "scratch" | "workout";

const STEP_TITLES: Record<Step, string> = {
  details: "New Routine",
  source: "Add Exercises",
  scratch: "Select Exercises",
  workout: "Pick a Workout",
};

export function CreateRoutine({
  route,
}: {
  route: { params?: { prefilledWorkoutId?: string } };
}) {
  const navigation = useNavigation();
  const prefilledWorkoutId = route.params?.prefilledWorkoutId;
  const { user } = useAuth();
  const colors = useThemeColors();

  const {
    exercises,
    loading: exercisesLoading,
    fetchExercises,
  } = useExerciseList(false);
  const {
    workouts,
    loading: workoutsLoading,
    fetchWorkouts,
  } = useUserWorkouts();

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    prefilledWorkoutId ?? null,
  );
  const [submitting, setSubmitting] = useState(false);

  const stepBack: Record<Step, Step | null> = {
    details: null,
    source: "details",
    scratch: "source",
    workout: "source",
  };

  useLayoutEffect(() => {
    const prevStep = stepBack[step];
    navigation.setOptions({
      title: STEP_TITLES[step],
      headerStyle: { backgroundColor: colors.bg },
      headerTitleStyle: { color: colors.text, fontWeight: "700", fontSize: 17 },
      headerTintColor: colors.text,
      headerShadowVisible: false,
      gestureEnabled: prevStep === null,
      headerLeft: () => (
        <BackButton
          onPress={
            prevStep ? () => setStep(prevStep) : () => navigation.goBack()
          }
          color={colors.text}
        />
      ),
    });
  }, [navigation, step, colors]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
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
    fetchExercises();
  };

  const handleChooseWorkout = () => {
    setStep("workout");
    if (user) fetchWorkouts(user.userId);
  };

  const toggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  };

  const handleSubmitFromScratch = async () => {
    if (selectedExerciseIds.length === 0) {
      Alert.alert(
        "No exercises",
        "Please select at least one exercise for your routine.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const days = selectedDays.map((d) => DAY_FULL[d]);
      await createRoutine(name.trim(), days, selectedExerciseIds);
      navigation.goBack();
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
      await createRoutineFromWorkout(workoutId, name.trim(), days);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to create routine. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExercises = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return exercises;
    return exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        ex.bodyParts.some((bp) => bp.bodyPart.toLowerCase().includes(q)),
    );
  }, [exercises, searchQuery]);

  if (step === "details") {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.flex, { backgroundColor: colors.bg }]}
      >
        <ScrollView contentContainerStyle={styles.stepContent}>
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
                      { color: active ? colors.pillActiveText : colors.text },
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
  }

  if (step === "source") {
    return (
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.stepContent}
      >
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
            <Text
              style={[styles.sourceCardSubtitle, { color: colors.secondary }]}
            >
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
            <Text
              style={[styles.sourceCardSubtitle, { color: colors.secondary }]}
            >
              Copy exercises from a completed workout
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.secondary }]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === "scratch") {
    return (
      <View style={[styles.flex, { backgroundColor: colors.bg }]}>
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
              const posIndex = selectedExerciseIds.indexOf(item.exerciseId);
              const selected = posIndex !== -1;
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
                    <Text style={[styles.exerciseName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.exerciseBodyPart,
                        { color: colors.secondary },
                      ]}
                    >
                      {renderBodyParts(
                        item.bodyParts,
                        colors.secondary,
                        "#007AFF",
                      )}
                    </Text>
                  </View>
                  {selected && (
                    <View style={styles.positionBadge}>
                      <Text style={styles.positionBadgeText}>
                        {posIndex + 1}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        <SafeAreaView
          edges={["bottom"]}
          style={[
            styles.stickyBottom,
            { backgroundColor: colors.bg, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.disabledButton]}
            onPress={handleSubmitFromScratch}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Routine</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // step === "workout"
  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
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
                    backgroundColor: selected ? colors.selected : "transparent",
                  },
                ]}
                onPress={() => setSelectedWorkoutId(item.workoutId)}
              >
                <View style={styles.exerciseRowLeft}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.exerciseBodyPart,
                      { color: colors.secondary },
                    ]}
                  >
                    {parseLocalDate(item.datePerformed).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
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

      <SafeAreaView
        edges={["bottom"]}
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
  positionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  positionBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    includeFontPadding: false,
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
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
