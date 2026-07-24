import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/Text";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Button, Host, Image, Menu } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import Svg, { Path } from "react-native-svg";
import { Exercise } from "../../api/exerciseService";
import { Routine, RoutineExercise } from "../../api/types";
import { updateRoutine, RoutineExerciseInput } from "../../api/routineService";
import { useSwipeableDelete } from "../../hooks/useSwipeableDelete";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { DAYS, DAY_FULL, DAY_SHORT } from "../../utils/days";
import { useThemeColors } from "../../hooks/useThemeColors";
import { useExerciseList } from "../../hooks/useExerciseList";
import { renderBodyParts } from "../../utils/exerciseUtils";
import { useExerciseFilter } from "../../hooks/useExerciseFilter";
import { ExerciseFilterBar } from "../../components/ExerciseFilterBar";
import { Spinner } from "../../components/Spinner";

/**
 * A draggable unit in the list: either a single ungrouped exercise or a whole
 * superset group (consecutive rows sharing a supersetGroup). Groups get a
 * stable `sg-<groupId>` key so the block identity survives member changes;
 * singles are keyed by their routineExerciseId.
 */
type ExerciseListBlock = {
  key: string;
  rows: RoutineExercise[];
  startIndex: number;
  groupId: number | null;
};

/**
 * Normalize server data into locally trustworthy grouping: only CONSECUTIVE
 * runs of 2+ rows sharing a non-null supersetGroup stay grouped (mirrors the
 * server adjacency rule, so degraded data renders sanely), and each run is
 * reminted with a fresh sequential local id so a group id can never label two
 * separate runs. Local ids are renumbered again at save time anyway.
 */
function sanitizeGroups(rows: RoutineExercise[]): RoutineExercise[] {
  const out: RoutineExercise[] = [];
  let nextId = 1;
  let i = 0;
  while (i < rows.length) {
    const g = rows[i].supersetGroup;
    if (g == null) {
      out.push({ ...rows[i], supersetGroup: undefined });
      i++;
      continue;
    }
    let j = i;
    while (j < rows.length && rows[j].supersetGroup === g) j++;
    if (j - i >= 2) {
      const id = nextId++;
      for (let k = i; k < j; k++) out.push({ ...rows[k], supersetGroup: id });
    } else {
      out.push({ ...rows[i], supersetGroup: undefined });
    }
    i = j;
  }
  return out;
}

/** A superset needs 2+ members; strip the field from any lone survivor. */
function dissolveSingletonGroups(rows: RoutineExercise[]): RoutineExercise[] {
  const memberCounts = new Map<number, number>();
  for (const ex of rows) {
    if (ex.supersetGroup == null) continue;
    memberCounts.set(
      ex.supersetGroup,
      (memberCounts.get(ex.supersetGroup) ?? 0) + 1,
    );
  }
  let changed = false;
  const next = rows.map((ex) => {
    if (
      ex.supersetGroup != null &&
      (memberCounts.get(ex.supersetGroup) ?? 0) < 2
    ) {
      changed = true;
      return { ...ex, supersetGroup: undefined };
    }
    return ex;
  });
  return changed ? next : rows;
}

function LinkGlyph({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Ellipsis-anchored superset menu for one exercise row. Native SwiftUI menu
 * on iOS (same pattern as RoutineList's card menu); an Alert list elsewhere.
 * Renders nothing when the row has no applicable actions.
 */
function RowMenu({
  color,
  canLinkAbove,
  isGrouped,
  onLinkAbove,
  onRemoveSuperset,
}: {
  color: string;
  canLinkAbove: boolean;
  isGrouped: boolean;
  onLinkAbove: () => void;
  onRemoveSuperset: () => void;
}) {
  if (!canLinkAbove && !isGrouped) return null;

  if (Platform.OS !== "ios") {
    return (
      <TouchableOpacity
        accessibilityLabel="Exercise options"
        hitSlop={10}
        style={styles.rowMenuBtn}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          const buttons: {
            text: string;
            onPress?: () => void;
            style?: "cancel";
          }[] = [];
          if (canLinkAbove) {
            buttons.push({ text: "Superset with above", onPress: onLinkAbove });
          }
          if (isGrouped) {
            buttons.push({
              text: "Remove superset",
              onPress: onRemoveSuperset,
            });
          }
          buttons.push({ text: "Cancel", style: "cancel" });
          Alert.alert("Exercise options", undefined, buttons);
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color={color} />
      </TouchableOpacity>
    );
  }

  const items = [];
  if (canLinkAbove) {
    items.push(
      <Button
        key="link"
        label="Superset with above"
        systemImage="link"
        onPress={onLinkAbove}
      />,
    );
  }
  if (isGrouped) {
    items.push(
      <Button
        key="unlink"
        label="Remove superset"
        systemImage="minus.circle"
        onPress={onRemoveSuperset}
      />,
    );
  }

  return (
    <View style={styles.rowMenuBtn} accessibilityLabel="Exercise options">
      {/* Keyed by item structure: a mounted SwiftUI Host does not survive its
          Menu's children changing (same fix as ExerciseOptionsMenu), and this
          menu's items flip with link state after every link/unlink/reorder. */}
      <Host key={`${canLinkAbove}:${isGrouped}`} style={styles.menuHost}>
        <Menu
          label={
            <Image
              systemName="ellipsis"
              size={17}
              color={color}
              modifiers={[frame({ width: 28, height: 28 })]}
            />
          }
        >
          {items}
        </Menu>
      </Host>
    </View>
  );
}

export function EditRoutine({
  route,
}: {
  route: { params: { routine: Routine } };
}) {
  const { routine } = route.params;
  const navigation = useNavigation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const accent = colors.isDark ? "#fff" : "#000";
  const activeBg = colors.isDark ? "#2A2A2C" : "#E8E8ED";

  const [name, setName] = useState(routine.name);
  const [selectedDays, setSelectedDays] = useState<string[]>(
    routine.scheduledDays
      .map((d) => DAY_SHORT[d])
      .filter((d): d is string => Boolean(d)),
  );
  const [selectedExercises, setSelectedExercises] = useState<RoutineExercise[]>(
    () =>
      sanitizeGroups(
        [...routine.exercises].sort((a, b) => a.position - b.position),
      ),
  );
  const { exercises: allExercises, loading: loadingExercises } =
    useExerciseList();

  const {
    searchQuery,
    setSearchQuery,
    selectedBodyPart,
    setSelectedBodyPart,
    bodyParts,
    sections,
  } = useExerciseFilter(allExercises);

  const filteredExercises = sections.flatMap((s) => s.data);

  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
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
      // Normalize local group ids to 1..N by first appearance and strip
      // singletons before sending; the server runs the same hygiene pass.
      const memberCounts = new Map<number, number>();
      for (const ex of selectedExercises) {
        if (ex.supersetGroup == null) continue;
        memberCounts.set(
          ex.supersetGroup,
          (memberCounts.get(ex.supersetGroup) ?? 0) + 1,
        );
      }
      const remap = new Map<number, number>();
      const exercises: RoutineExerciseInput[] = selectedExercises.map((ex) => {
        const g = ex.supersetGroup;
        if (g == null || (memberCounts.get(g) ?? 0) < 2) {
          return { exerciseId: ex.exerciseId };
        }
        if (!remap.has(g)) remap.set(g, remap.size + 1);
        return { exerciseId: ex.exerciseId, supersetGroup: remap.get(g) };
      });
      await updateRoutine(routine.routineId, {
        name: name.trim(),
        scheduledDays: selectedDays.map((d) => DAY_FULL[d]),
        exercises,
      });
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to update routine. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [name, selectedExercises, selectedDays, routine.routineId, navigation]);

  const selectedExerciseIds = useMemo(
    () => new Set(selectedExercises.map((ex) => ex.exerciseId)),
    [selectedExercises],
  );

  // Blocks the drag list renders: consecutive rows sharing a group collapse
  // into one draggable unit, so dragging can never split a superset.
  const blocks = useMemo<ExerciseListBlock[]>(() => {
    const result: ExerciseListBlock[] = [];
    let i = 0;
    while (i < selectedExercises.length) {
      const g = selectedExercises[i].supersetGroup;
      if (g == null) {
        result.push({
          key: selectedExercises[i].routineExerciseId,
          rows: [selectedExercises[i]],
          startIndex: i,
          groupId: null,
        });
        i++;
        continue;
      }
      let j = i;
      while (
        j < selectedExercises.length &&
        selectedExercises[j].supersetGroup === g
      )
        j++;
      if (j - i >= 2) {
        result.push({
          key: `sg-${g}`,
          rows: selectedExercises.slice(i, j),
          startIndex: i,
          groupId: g,
        });
      } else {
        result.push({
          key: selectedExercises[i].routineExerciseId,
          rows: [selectedExercises[i]],
          startIndex: i,
          groupId: null,
        });
      }
      i = j;
    }
    return result;
  }, [selectedExercises]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const removeExercise = (routineExerciseId: string) => {
    // Removal never splits the remaining members, so contiguity holds;
    // a group left with one survivor dissolves.
    setSelectedExercises((prev) =>
      dissolveSingletonGroups(
        prev.filter((ex) => ex.routineExerciseId !== routineExerciseId),
      ),
    );
  };

  // Join the row above's group (or mint a fresh group for the pair). The row
  // above is always the LAST member of its run when this row isn't already in
  // it, so stamping this row keeps the group contiguous by construction.
  const linkWithAbove = (routineExerciseId: string) => {
    setSelectedExercises((prev) => {
      const idx = prev.findIndex(
        (ex) => ex.routineExerciseId === routineExerciseId,
      );
      if (idx <= 0) return prev;
      const above = prev[idx - 1];
      if (
        above.supersetGroup != null &&
        above.supersetGroup === prev[idx].supersetGroup
      ) {
        return prev;
      }
      const groupId =
        above.supersetGroup ??
        Math.max(0, ...prev.map((ex) => ex.supersetGroup ?? 0)) + 1;
      const next = prev.map((ex, i) =>
        i === idx || i === idx - 1 ? { ...ex, supersetGroup: groupId } : ex,
      );
      // If this row was the head of another group, that group may have
      // shrunk to one member; dissolve it.
      return dissolveSingletonGroups(next);
    });
  };

  // Take one row out of its superset. Unlinking a MIDDLE member of a 3+
  // group would leave the survivors split around it, so that row moves to
  // just past the group's last member; first/last members disturb no one.
  const removeSuperset = (routineExerciseId: string) => {
    setSelectedExercises((prev) => {
      const index = prev.findIndex(
        (ex) => ex.routineExerciseId === routineExerciseId,
      );
      if (index === -1) return prev;
      const groupId = prev[index].supersetGroup;
      if (groupId == null) return prev;

      const next = prev.map((ex) =>
        ex.routineExerciseId === routineExerciseId
          ? { ...ex, supersetGroup: undefined }
          : ex,
      );
      const memberIndexes: number[] = [];
      for (let i = 0; i < next.length; i++) {
        if (next[i].supersetGroup === groupId) memberIndexes.push(i);
      }
      if (memberIndexes.length > 0) {
        const first = memberIndexes[0];
        const last = memberIndexes[memberIndexes.length - 1];
        if (index > first && index < last) {
          const [moved] = next.splice(index, 1);
          // `last` shifted down by one when the earlier element was removed,
          // so inserting at `last` lands immediately after the group.
          next.splice(last, 0, moved);
        }
      }
      return dissolveSingletonGroups(next);
    });
  };

  const addExercise = (exercise: Exercise) => {
    const nextPosition = selectedExercises.length + 1;
    setSelectedExercises((prev) => [
      ...prev,
      {
        routineExerciseId: `new-${exercise.exerciseId}-${Date.now()}`,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.name,
        bodyParts: exercise.bodyParts,
        position: nextPosition,
      },
    ]);
  };

  const { getSwipeableProps } = useSwipeableDelete({
    onDelete: removeExercise,
    deleteTitle: "Remove Exercise",
    deleteMessage: "Remove this exercise from the routine?",
  });

  const renderRowContent = (
    row: RoutineExercise,
    flatIndex: number,
    drag: () => void,
  ) => {
    const above = flatIndex > 0 ? selectedExercises[flatIndex - 1] : null;
    const isGrouped = row.supersetGroup != null;
    const canLinkAbove =
      above != null &&
      !(isGrouped && row.supersetGroup === above.supersetGroup);
    return (
      <>
        <View style={styles.selectedInfo}>
          <Text style={[styles.selectedTitle, { color: colors.text }]}>
            {flatIndex + 1}. {row.exerciseName}
          </Text>
          <Text style={[styles.selectedSubtitle, { color: colors.secondary }]}>
            {renderBodyParts(row.bodyParts, colors.secondary, accent)}
          </Text>
        </View>
        <RowMenu
          color={colors.secondary}
          canLinkAbove={canLinkAbove}
          isGrouped={isGrouped}
          onLinkAbove={() => linkWithAbove(row.routineExerciseId)}
          onRemoveSuperset={() => removeSuperset(row.routineExerciseId)}
        />
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={150}
          style={styles.dragHandle}
          hitSlop={8}
        >
          <View
            style={[styles.handleBar, { backgroundColor: colors.handle }]}
          />
          <View
            style={[styles.handleBar, { backgroundColor: colors.handle }]}
          />
          <View
            style={[styles.handleBar, { backgroundColor: colors.handle }]}
          />
        </TouchableOpacity>
      </>
    );
  };

  const renderBlockItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<ExerciseListBlock>) => {
    if (item.groupId == null) {
      const row = item.rows[0];
      return (
        <ScaleDecorator activeScale={1.03}>
          <View style={styles.selectedRowWrapper}>
            <Swipeable {...getSwipeableProps(row.routineExerciseId)}>
              <View
                style={[
                  styles.selectedRow,
                  {
                    backgroundColor: isActive ? activeBg : colors.cardBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                {renderRowContent(row, item.startIndex, drag)}
              </View>
            </Swipeable>
          </View>
        </ScaleDecorator>
      );
    }

    // A whole superset group drags as one item.
    return (
      <ScaleDecorator activeScale={1.03}>
        <View
          style={[
            styles.groupContainer,
            {
              backgroundColor: isActive ? activeBg : colors.cardBg,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.groupHeader}>
            <LinkGlyph color={colors.secondary} />
            <Text style={[styles.groupLabel, { color: colors.secondary }]}>
              SUPERSET
            </Text>
          </View>
          {item.rows.map((row, j) => (
            <View key={row.routineExerciseId}>
              {j > 0 && (
                <View
                  style={[
                    styles.memberDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
              )}
              <Swipeable {...getSwipeableProps(row.routineExerciseId)}>
                <View
                  style={[
                    styles.memberRow,
                    { backgroundColor: isActive ? activeBg : colors.cardBg },
                  ]}
                >
                  {renderRowContent(row, item.startIndex + j, drag)}
                </View>
              </Swipeable>
            </View>
          ))}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.appBg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      <TouchableOpacity
        accessibilityLabel="Save"
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
        style={[
          styles.floatingSave,
          {
            top: insets.top + 8,
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
          },
        ]}
      >
        {saving ? (
          <Spinner size="small" color={colors.text} />
        ) : (
          <Text style={[styles.saveText, { color: colors.text }]}>✓</Text>
        )}
      </TouchableOpacity>
      <DraggableFlatList
        data={blocks}
        keyExtractor={(item) => item.key}
        renderItem={renderBlockItem}
        onDragEnd={({ data }) =>
          setSelectedExercises(data.flatMap((block) => block.rows))
        }
        activationDistance={10}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60 },
        ]}
        ListHeaderComponent={
          <>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Edit Routine
            </Text>
            {/* Routine name */}
            <View style={styles.sectionWrap}>
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
                value={name}
                onChangeText={setName}
                placeholder="Routine name"
                placeholderTextColor={colors.secondary}
              />
            </View>

            {/* Scheduled days */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.label, { color: colors.secondary }]}>
                SCHEDULED DAYS
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
                          backgroundColor: active
                            ? colors.pillActive
                            : colors.pill,
                        },
                      ]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text
                        style={[
                          styles.dayPillText,
                          {
                            color: active ? colors.pillActiveText : colors.text,
                          },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selected exercises label */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.label, { color: colors.secondary }]}>
                EXERCISES ({selectedExercises.length})
              </Text>
              {selectedExercises.length === 0 && (
                <Text style={[styles.emptyHint, { color: colors.secondary }]}>
                  Add exercises from the list below.
                </Text>
              )}
            </View>
          </>
        }
        ListFooterComponent={
          <View style={styles.sectionWrap}>
            <Text style={[styles.label, { color: colors.secondary }]}>
              ADD EXERCISES
            </Text>
            <ExerciseFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              bodyParts={bodyParts}
              selectedBodyPart={selectedBodyPart}
              onSelectBodyPart={setSelectedBodyPart}
            />

            {loadingExercises ? (
              <View style={styles.loadingWrap}>
                <Spinner color={colors.isDark ? "#fff" : "#000"} />
              </View>
            ) : filteredExercises.length === 0 ? null : (
              sections.map((section) => (
                <View key={section.title}>
                  <Text
                    style={[styles.sectionHeader, { color: colors.secondary }]}
                  >
                    {section.title}
                  </Text>
                  {section.data.slice(0, 30).map((item) => (
                    <TouchableOpacity
                      key={item.exerciseId}
                      style={[
                        styles.availableRow,
                        {
                          borderBottomColor: colors.border,
                          backgroundColor: colors.cardBg,
                        },
                      ]}
                      onPress={() => addExercise(item)}
                    >
                      <View style={styles.selectedInfo}>
                        <Text
                          style={[styles.selectedTitle, { color: colors.text }]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.selectedSubtitle,
                            { color: colors.secondary },
                          ]}
                        >
                          {renderBodyParts(
                            item.bodyParts,
                            colors.secondary,
                            accent,
                          )}
                        </Text>
                      </View>
                      <Text style={[styles.addText, { color: colors.text }]}>
                        +
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  floatingSave: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  saveText: { fontSize: 20, fontWeight: "600", includeFontPadding: false },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 80 },
  sectionWrap: { marginTop: 8 },
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
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  dayPillText: { fontSize: 13, fontWeight: "600" },
  selectedRowWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  selectedRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  groupContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  groupLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 1 },
  memberRow: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  memberDivider: { height: StyleSheet.hairlineWidth },
  rowMenuBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  menuHost: { width: 28, height: 28 },
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingVertical: 10,
  },
});
