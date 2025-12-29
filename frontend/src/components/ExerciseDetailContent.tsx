import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Text,
  Keyboard,
} from "react-native";
import { useColorScheme } from "react-native";
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { Swipeable } from "react-native-gesture-handler";

import stopwatch from "../assets/stopwatch.png";

import { useWorkoutTimer, WorkoutExercise } from "../context/WorkoutContext";
import { useSwipeableDelete } from "../hooks/useSwipeableDelete";

interface ExerciseDetailContentProps {
  exercise: {
    exerciseId: string;
    name: string;
    workoutExerciseId?: string;
    sets?: Array<{ reps: string; weight: string }>;
  };
  onSummary: () => void;
  onAddExercise: () => void;
  isInPlayer?: boolean;
}

export interface ExerciseDetailContentRef {
  save: () => void;
}

export const ExerciseDetailContent = forwardRef<
  ExerciseDetailContentRef,
  ExerciseDetailContentProps
>(({ exercise, onSummary, onAddExercise, isInPlayer = false }, ref) => {
  const { seconds, addExercise } = useWorkoutTimer();
  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#999" : "#666",
    card: isDark ? "#1c1c1e" : "#fff",
    border: isDark ? "#333" : "#ccc",
    inputBg: isDark ? "#2a2a2a" : "#f2f2f2",
  };

  const formatTime = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0"
    )}`;

  // Initialize with existing sets or default empty set
  const [sets, setSets] = useState(
    exercise.sets && exercise.sets.length > 0
      ? exercise.sets.map((s, i) => ({ id: `${i}`, ...s }))
      : [{ id: "1", reps: "", weight: "" }]
  );

  // Track which sets we've already auto-added for to prevent duplicate additions
  const autoAddedFor = useRef(new Set<string>());
  const flatListRef = useRef<FlatList>(null);

  // Auto-add empty set when last one is filled (without causing keyboard dismissal)
  useEffect(() => {
    const last = sets[sets.length - 1];
    if (last.reps && last.weight && !autoAddedFor.current.has(last.id)) {
      autoAddedFor.current.add(last.id);
      // Defer to next tick to prevent keyboard dismissal
      setTimeout(() => {
        setSets((p) => [
          ...p,
          { id: Date.now().toString(), reps: "", weight: "" },
        ]);
        // Scroll to the new set after a short delay to ensure it's rendered
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, 0);
    }
  }, [sets]);

  // Swipeable delete hook
  const { getSwipeableProps } = useSwipeableDelete({
    onDelete: (id) => setSets((prev) => prev.filter((s) => s.id !== id)),
    deleteTitle: "Delete Set",
    deleteMessage: "Are you sure you want to delete this set?",
  });

  // Core save logic without navigation
  const saveExercise = () => {
    const validSets = sets.filter(
      (s) => s.reps.trim() !== "" && s.weight.trim() !== ""
    );
    if (validSets.length > 0) {
      addExercise({
        workoutExerciseId: exercise.workoutExerciseId || Date.now().toString(),
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        sets: validSets,
      });
    }
  };

  // Updated: handleSave now calls saveExercise() then callback
  const handleSave = (callback: () => void) => {
    saveExercise();
    callback();
  };

  // Expose save function via ref for parent component
  useImperativeHandle(ref, () => ({
    save: saveExercise,
  }));

  // Auto-save on keyboard dismiss
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        // Save current sets without navigating away
        saveExercise();
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [sets]); // Re-subscribe when sets change

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {exercise.name}
      </Text>

      <View style={[styles.fullDivider, { borderColor: colors.border }]} />

      {/* TIMER */}
      <View style={styles.timerRow}>
        <View style={styles.timerLeft}>
          <Image
            source={stopwatch}
            style={[styles.timerIcon, { tintColor: colors.text }]}
          />
          <Text style={[styles.timerText, { color: colors.text }]}>
            {formatTime(seconds)}
          </Text>
        </View>
      </View>

      {/* HEADERS */}
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderNum, { color: colors.subtle }]}>
          Set
        </Text>
        <Text style={[styles.tableHeaderText, { color: colors.subtle }]}>
          Reps
        </Text>
        <Text style={[styles.tableHeaderText, { color: colors.subtle }]}>
          Weight
        </Text>
      </View>

      {/* SET LIST */}
      <FlatList
        ref={flatListRef}
        data={sets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 10 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const setContent = (
            <View
              style={[
                styles.setCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.setNumber, { color: colors.text }]}>
                {index + 1}
              </Text>

              <TextInput
                placeholder="Reps"
                placeholderTextColor={colors.subtle}
                value={item.reps}
                keyboardType="numeric"
                onChangeText={(t) =>
                  setSets((prev) =>
                    prev.map((s) => (s.id === item.id ? { ...s, reps: t } : s))
                  )
                }
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, color: colors.text },
                ]}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <TextInput
                placeholder="Weight"
                placeholderTextColor={colors.subtle}
                value={item.weight}
                keyboardType="numeric"
                onChangeText={(t) =>
                  setSets((prev) =>
                    prev.map((s) =>
                      s.id === item.id ? { ...s, weight: t } : s
                    )
                  )
                }
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, color: colors.text },
                ]}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
          );

          return (
            <View style={styles.rowWrapper}>
              <Swipeable
                {...(sets.length > 1 ? getSwipeableProps(item.id) : {})}
                enabled={sets.length > 1}
              >
                {setContent}
              </Swipeable>
            </View>
          );
        }}
      />

      {/* FOOTER */}
      <View style={[styles.footerRow, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => handleSave(onSummary)}
        >
          <Text style={styles.footerButtonText}>Summary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => handleSave(onAddExercise)}
        >
          <Text style={styles.footerButtonText}>Select Exercise</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },

  fullDivider: {
    width: "100%",
    borderBottomWidth: 1,
    marginBottom: 16,
  },

  timerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 14,
  },

  timerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },

  timerIcon: { width: 24, height: 24 },
  timerText: { fontSize: 22, fontWeight: "600" },

  tableHeaderRow: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
  },

  tableHeaderNum: { width: 40, fontWeight: "600" },
  tableHeaderText: { flex: 1, fontWeight: "600" },

  rowWrapper: { borderRadius: 16, overflow: "hidden", marginVertical: 6 },

  setCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },

  setNumber: {
    width: 40,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 20,
  },

  footerButton: {
    flex: 1,
    padding: 16,
    marginHorizontal: 6,
    backgroundColor: "#007AFF",
    borderRadius: 12,
    alignItems: "center",
  },

  footerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
