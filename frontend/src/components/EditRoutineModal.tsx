import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllExercises, Exercise } from "../api/exerciseService";
import { Routine, RoutineExercise } from "../api/types";
import { updateRoutine } from "../api/routineService";
import { useSwipeableDelete } from "../hooks/useSwipeableDelete";

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
const DAY_SHORT: Record<string, string> = {
  MONDAY: "MON",
  TUESDAY: "TUE",
  WEDNESDAY: "WED",
  THURSDAY: "THU",
  FRIDAY: "FRI",
  SATURDAY: "SAT",
  SUNDAY: "SUN",
};

type Props = {
  visible: boolean;
  routine: Routine | null;
  onClose: () => void;
  onSaved: (routine: Routine) => void;
};

export function EditRoutineModal({ visible, routine, onClose, onSaved }: Props) {
  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#1C1C1E" : "#F2F2F7",
    surface: isDark ? "#2C2C2E" : "#fff",
    text: isDark ? "#fff" : "#000",
    secondary: isDark ? "#999" : "#666",
    border: isDark ? "#3A3A3C" : "#D1D1D6",
    inputBg: isDark ? "#3A3A3C" : "#fff",
    day: isDark ? "#3A3A3C" : "#E5E5EA",
    dayActive: "#007AFF",
    dayActiveText: "#fff",
    handle: isDark ? "#555" : "#C7C7CC",
  };

  const [name, setName] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<RoutineExercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!visible || !routine) return;
    setName(routine.name);
    setSelectedDays(
      routine.scheduledDays
        .map((d) => DAY_SHORT[d])
        .filter((d): d is string => Boolean(d)),
    );
    setSelectedExercises(
      [...routine.exercises].sort((a, b) => a.position - b.position),
    );
    setSearchQuery("");
  }, [visible, routine]);

  useEffect(() => {
    const load = async () => {
      if (!visible || allExercises.length > 0) return;
      setLoadingExercises(true);
      try {
        const data = await getAllExercises();
        setAllExercises(data);
      } catch {
        Alert.alert("Error", "Failed to load exercises.");
      } finally {
        setLoadingExercises(false);
      }
    };
    load();
  }, [visible, allExercises.length]);

  const selectedExerciseIds = useMemo(
    () => new Set(selectedExercises.map((ex) => ex.exerciseId)),
    [selectedExercises],
  );

  const filteredExercises = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allExercises.filter((ex) => {
      if (selectedExerciseIds.has(ex.exerciseId)) return false;
      if (!query) return true;
      return (
        ex.name.toLowerCase().includes(query) ||
        ex.bodyPart.toLowerCase().includes(query)
      );
    });
  }, [allExercises, searchQuery, selectedExerciseIds]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const removeExercise = (exerciseId: string) => {
    setSelectedExercises((prev) => prev.filter((ex) => ex.exerciseId !== exerciseId));
  };

  const addExercise = (exercise: Exercise) => {
    const nextPosition = selectedExercises.length + 1;
    setSelectedExercises((prev) => [
      ...prev,
      {
        routineExerciseId: `new-${exercise.exerciseId}`,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.name,
        bodyPart: exercise.bodyPart,
        position: nextPosition,
      },
    ]);
  };

  const handleSave = async () => {
    if (!routine) return;
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a routine name.");
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert("No exercises", "Please add at least one exercise.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateRoutine(routine.routineId, {
        name: name.trim(),
        scheduledDays: selectedDays.map((d) => DAY_FULL[d]),
        exerciseIds: selectedExercises.map((ex) => ex.exerciseId),
      });
      onSaved(updated);
    } catch {
      Alert.alert("Error", "Failed to update routine. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const { getSwipeableProps } = useSwipeableDelete({
    onDelete: removeExercise,
    deleteTitle: "Remove Exercise",
    deleteMessage: "Remove this exercise from the routine?",
  });

  const renderExerciseItem = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<RoutineExercise>) => {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator activeScale={1.03}>
        <Swipeable {...getSwipeableProps(item.exerciseId)}>
          <View
            style={[
              styles.selectedRow,
              {
                backgroundColor: isActive
                  ? isDark
                    ? "#2A2A2C"
                    : "#E8E8ED"
                  : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.selectedInfo}>
              <Text style={[styles.selectedTitle, { color: colors.text }]}>
                {index + 1}. {item.exerciseName}
              </Text>
              <Text style={[styles.selectedSubtitle, { color: colors.secondary }]}>
                {item.bodyPart}
              </Text>
            </View>
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={150}
              style={styles.dragHandle}
              hitSlop={8}
            >
              <View style={[styles.handleBar, { backgroundColor: colors.handle }]} />
              <View style={[styles.handleBar, { backgroundColor: colors.handle }]} />
              <View style={[styles.handleBar, { backgroundColor: colors.handle }]} />
            </TouchableOpacity>
          </View>
        </Swipeable>
      </ScaleDecorator>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeaderContent}>
      <Text style={[styles.label, { color: colors.secondary }]}>ROUTINE NAME</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={name}
        onChangeText={setName}
        placeholder="Routine name"
        placeholderTextColor={colors.secondary}
      />

      <Text style={[styles.label, { color: colors.secondary }]}>SCHEDULED DAYS</Text>
      <View style={styles.daysRow}>
        {DAYS.map((day) => {
          const active = selectedDays.includes(day);
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayPill,
                { backgroundColor: active ? colors.dayActive : colors.day },
              ]}
              onPress={() => toggleDay(day)}
            >
              <Text
                style={[
                  styles.dayPillText,
                  { color: active ? colors.dayActiveText : colors.text },
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.secondary }]}>
        EXERCISES ({selectedExercises.length})
      </Text>
      {selectedExercises.length === 0 && (
        <Text style={[styles.emptyHint, { color: colors.secondary }]}>
          Add exercises from the list below.
        </Text>
      )}
    </View>
  );

  const ListFooter = () => (
    <View style={styles.listFooterContent}>
      <Text style={[styles.label, { color: colors.secondary }]}>ADD EXERCISES</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search exercises..."
        placeholderTextColor={colors.secondary}
      />

      {loadingExercises ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#007AFF" />
        </View>
      ) : (
        filteredExercises.slice(0, 30).map((item) => (
          <TouchableOpacity
            key={item.exerciseId}
            style={[
              styles.availableRow,
              { borderBottomColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={() => addExercise(item)}
          >
            <View style={styles.selectedInfo}>
              <Text style={[styles.selectedTitle, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.selectedSubtitle, { color: colors.secondary }]}>
                {item.bodyPart}
              </Text>
            </View>
            <Text style={[styles.addText, { color: "#007AFF" }]}>Add</Text>
          </TouchableOpacity>
        ))
      )}
      <View style={styles.bottomPad} />
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
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.secondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Routine</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={saving}
          >
            <Text style={[styles.headerButtonText, { color: "#007AFF" }]}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <DraggableFlatList
          data={selectedExercises}
          keyExtractor={(item) => item.routineExerciseId}
          renderItem={renderExerciseItem}
          onDragEnd={({ data }) => setSelectedExercises(data)}
          ListHeaderComponent={<ListHeader />}
          ListFooterComponent={<ListFooter />}
          contentContainerStyle={styles.listContent}
          activationDistance={10}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 64,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 40,
  },
  listHeaderContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listFooterContent: {
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  selectedRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  selectedSubtitle: {
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  handleBar: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  availableRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  addText: {
    fontSize: 14,
    fontWeight: "700",
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyHint: {
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 4,
  },
  bottomPad: {
    height: 40,
  },
});
