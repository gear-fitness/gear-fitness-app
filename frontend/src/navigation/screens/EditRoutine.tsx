import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { getAllExercises, Exercise } from "../../api/exerciseService";
import { Routine, RoutineExercise } from "../../api/types";
import { updateRoutine } from "../../api/routineService";
import { useSwipeableDelete } from "../../hooks/useSwipeableDelete";
import { BackButton } from "../../components/BackButton";
import { Appearance } from "react-native";

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

type RootStackParamList = {
  EditRoutine: { routine: Routine };
};

type Props = NativeStackScreenProps<RootStackParamList, "EditRoutine">;

export function EditRoutine({ route }: Props) {
  const { routine } = route.params;
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "#000" : "#fff",
    surface: isDark ? "#1C1C1E" : "#F2F2F7",
    text: isDark ? "#fff" : "#000",
    secondary: isDark ? "#999" : "#666",
    border: isDark ? "#3A3A3C" : "#D1D1D6",
    inputBg: isDark ? "#1C1C1E" : "#F2F2F7",
    day: isDark ? "#3A3A3C" : "#E5E5EA",
    dayActive: "#007AFF",
    dayActiveText: "#fff",
    handle: isDark ? "#555" : "#C7C7CC",
  };

  const [name, setName] = useState(routine.name);
  const [selectedDays, setSelectedDays] = useState<string[]>(
    routine.scheduledDays
      .map((d) => DAY_SHORT[d])
      .filter((d): d is string => Boolean(d))
  );
  const [selectedExercises, setSelectedExercises] = useState<RoutineExercise[]>(
    [...routine.exercises].sort((a, b) => a.position - b.position)
  );
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSave = async () => {
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
      await updateRoutine(routine.routineId, {
        name: name.trim(),
        scheduledDays: selectedDays.map((d) => DAY_FULL[d]),
        exerciseIds: selectedExercises.map((ex) => ex.exerciseId),
      });
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to update routine. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.bg },
      headerTitleStyle: { color: colors.text, fontWeight: "700", fontSize: 17 },
      headerTintColor: colors.text,
      headerShadowVisible: false,
      headerLeft: () => (
        <BackButton onPress={() => navigation.goBack()} color={colors.text} />
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={[styles.saveText, { color: colors.text }]}>✓</Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors, saving, handleSave]);

  useEffect(() => {
    const load = async () => {
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
  }, []);

  const selectedExerciseIds = useMemo(
    () => new Set(selectedExercises.map((ex) => ex.exerciseId)),
    [selectedExercises]
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
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
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
        <View style={styles.selectedRowWrapper}>
        <Swipeable {...getSwipeableProps(item.exerciseId)}>
          <View
            style={[
              styles.selectedRow,
              {
                backgroundColor: isActive
                  ? isDark ? "#2A2A2C" : "#E8E8ED"
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
        </View>
      </ScaleDecorator>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeaderContent}>
      <Text style={[styles.label, { color: colors.secondary }]}>ROUTINE NAME</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
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
          { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
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
              <Text style={[styles.selectedTitle, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.selectedSubtitle, { color: colors.secondary }]}>
                {item.bodyPart}
              </Text>
            </View>
            <Text style={[styles.addText, { color: colors.text }]}>+</Text>
          </TouchableOpacity>
        ))
      )}
      <View style={styles.bottomPad} />
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  saveText: { fontSize: 22, fontWeight: "600", includeFontPadding: false },
  listContent: { paddingBottom: 40 },
  listHeaderContent: { paddingHorizontal: 16, paddingTop: 8 },
  listFooterContent: { paddingHorizontal: 16 },
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
    marginBottom: 16,
  },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  dayPillText: { fontSize: 13, fontWeight: "600" },
  selectedRowWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    marginHorizontal: 16,
  },
  selectedRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  selectedInfo: { flex: 1 },
  selectedTitle: { fontSize: 15, fontWeight: "600" },
  selectedSubtitle: { fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  handleBar: { width: 20, height: 2, borderRadius: 1 },
  availableRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  addText: { fontSize: 22, fontWeight: "300" },
  loadingWrap: { paddingVertical: 20, alignItems: "center" },
  emptyHint: { fontSize: 13, fontStyle: "italic", marginBottom: 4 },
  bottomPad: { height: 40 },
});
