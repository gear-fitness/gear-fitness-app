import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Text,
  Keyboard,
  Platform,
  InputAccessoryView,
  Button,
  Modal,
  ActionSheetIOS,
  Alert,
  Animated,
  useColorScheme,
} from "react-native";
import { GlassView } from "expo-glass-effect";
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
} from "react";
import { ScrollView } from "react-native-gesture-handler";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useNavigation } from "@react-navigation/native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import stopwatch from "../assets/stopwatch.png";
import { useWorkoutTimer, WorkoutSet } from "../context/WorkoutContext";
import { useSwipeableDelete } from "../hooks/useSwipeableDelete";
import { BodyPartDTO } from "../api/exerciseService";
import { FloatingCloseButton } from "./FloatingCloseButton";

interface ExerciseDetailContentProps {
  exercise: {
    exerciseId: string;
    name: string;
    workoutExerciseId?: string;
    sets?: WorkoutSet[];
    note?: string;
    bodyParts?: BodyPartDTO[];
  };
  onSummary: () => void;
  onAddExercise: () => void;
  isInPlayer?: boolean;
}

export interface ExerciseDetailContentRef {
  save: () => void;
}

const inputAccessoryViewID = "exerciseDetailInput";

type ThemeColors = {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  chipBg: string;
  primaryBg: string;
  primaryText: string;
  accent: string;
  accentText: string;
  stepperBg: string;
  stepperBorder: string;
};

type LoggedSet = WorkoutSet & { id: string };

type EditingState = {
  id: string;
  originalIndex: number;
  originalReps: string;
  originalWeight: string;
  previousReps: string;
  previousWeight: string;
} | null;

const BAR_WEIGHT = 45;
const PLATE_OPTIONS = [45, 35, 25, 10, 5, 2.5];
const PLATE_HEIGHTS: Record<string, number> = {
  "45": 36,
  "35": 32,
  "25": 28,
  "10": 22,
  "5": 18,
  "2.5": 14,
};

type PlateMode = "dual" | "single";

function platesFromWeight(
  weight: string,
  mode: PlateMode,
  bar: number,
): number[] {
  const divisor = mode === "single" ? 1 : 2;
  let remaining = Math.max(0, (Number(weight || 0) - bar) / divisor);
  const stack: number[] = [];
  for (const p of PLATE_OPTIONS) {
    while (remaining >= p - 0.0001) {
      stack.push(p);
      remaining -= p;
    }
  }
  return stack;
}

function formatWeight(n: number): string {
  if (!isFinite(n)) return "0";
  return n % 1 === 0 ? String(n) : Number(n.toFixed(1)).toString();
}

function plateMath(bar: number, sideTotal: number, mode: PlateMode): string {
  const sideStr = formatWeight(sideTotal);
  if (bar > 0 && sideTotal > 0)
    return mode === "single"
      ? `${bar} + ${sideStr}`
      : `${bar} + ${sideStr} × 2`;
  if (bar > 0) return `${bar} bar`;
  if (sideTotal > 0) return mode === "single" ? sideStr : `${sideStr} × 2`;
  return "0";
}

export const ExerciseDetailContent = forwardRef<
  ExerciseDetailContentRef,
  ExerciseDetailContentProps
>(({ exercise, onSummary, onAddExercise }, ref) => {
  const { seconds, exercises, addExercise } = useWorkoutTimer();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();

  const colors: ThemeColors = isDark
    ? {
        bg: "#0a0a0a",
        surface: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        border: "rgba(255,255,255,0.08)",
        chipBg: "rgba(255,255,255,0.08)",
        primaryBg: "#fff",
        primaryText: "#000",
        accent: "#fff",
        accentText: "#000",
        stepperBg: "rgba(255,255,255,0.06)",
        stepperBorder: "rgba(255,255,255,0.12)",
      }
    : {
        bg: "#fafafa",
        surface: "#fff",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        textFaint: "rgba(0,0,0,0.4)",
        border: "rgba(0,0,0,0.08)",
        chipBg: "rgba(0,0,0,0.05)",
        primaryBg: "#000",
        primaryText: "#fff",
        accent: "#000",
        accentText: "#fff",
        stepperBg: "#fff",
        stepperBorder: "rgba(0,0,0,0.1)",
      };

  const formatTime = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0",
    )}`;

  const initialLogged: LoggedSet[] = (exercise.sets || [])
    .filter((s) => s.reps?.trim() && s.weight?.trim())
    .map((s, i) => ({ id: `seed-${i}`, reps: s.reps, weight: s.weight }));

  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>(initialLogged);
  const [currentReps, setCurrentReps] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [note, setNote] = useState(exercise.note || "");
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [showingTotal, setShowingTotal] = useState(false);
  const [exerciseSeconds, setExerciseSeconds] = useState(0);
  const [platesEnabled, setPlatesEnabled] = useState(false);
  const [platesOpen, setPlatesOpen] = useState(false);
  const [plateMode, setPlateMode] = useState<PlateMode>("dual");
  const [plateBarOn, setPlateBarOn] = useState(false);
  const [editing, setEditing] = useState<EditingState>(null);

  const plateBar = plateBarOn ? BAR_WEIGHT : 0;
  const plateMultiplier = plateMode === "single" ? 1 : 2;
  const plateStack = platesFromWeight(currentWeight, plateMode, plateBar);
  const plateSideTotal = plateStack.reduce((a, b) => a + b, 0);

  const togglePlatesEnabled = () => {
    const next = !platesEnabled;
    setPlatesEnabled(next);
    setPlatesOpen(next);
    if (next) setCurrentWeight(formatWeight(plateBar));
  };

  const handleAddPlate = (p: number) => {
    const next = Number(currentWeight || 0) + p * plateMultiplier;
    setCurrentWeight(formatWeight(next));
  };

  const handlePopPlate = () => {
    if (plateStack.length === 0) return;
    const top = plateStack[plateStack.length - 1];
    const next = Number(currentWeight || 0) - top * plateMultiplier;
    setCurrentWeight(formatWeight(Math.max(plateBar, next)));
  };

  const handleClearPlates = () => {
    setCurrentWeight(formatWeight(plateBar));
  };

  const handlePlateModeChange = (m: PlateMode) => {
    if (m === plateMode) return;
    const newMultiplier = m === "single" ? 1 : 2;
    const next = plateBar + plateSideTotal * newMultiplier;
    setPlateMode(m);
    setCurrentWeight(formatWeight(next));
  };

  const handlePlateBarToggle = () => {
    const nextBarOn = !plateBarOn;
    const nextBar = nextBarOn ? BAR_WEIGHT : 0;
    const next = nextBar + plateSideTotal * plateMultiplier;
    setPlateBarOn(nextBarOn);
    setCurrentWeight(formatWeight(next));
  };

  useEffect(() => {
    const id = setInterval(() => setExerciseSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!showingTotal) return;
    const id = setTimeout(() => setShowingTotal(false), 5000);
    return () => clearTimeout(id);
  }, [showingTotal]);

  const exerciseNum = useMemo(() => {
    const idx = exercises.findIndex(
      (e) => e.workoutExerciseId === exercise.workoutExerciseId,
    );
    return idx >= 0 ? idx + 1 : exercises.length + 1;
  }, [exercises, exercise.workoutExerciseId]);

  const { getSwipeableProps } = useSwipeableDelete({
    onDelete: (id) => {
      const idx = loggedSets.findIndex((s) => s.id === id);
      if (idx < 0) return;
      setLoggedSets((prev) => prev.filter((s) => s.id !== id));
      if (editing && idx < editing.originalIndex) {
        setEditing((e) => (e ? { ...e, originalIndex: e.originalIndex - 1 } : e));
      }
    },
    deleteTitle: "Delete Set",
    deleteMessage: "Are you sure you want to delete this set?",
  });

  const saveExercise = () => {
    const allSets: WorkoutSet[] = loggedSets.map(({ reps, weight }) => ({
      reps,
      weight,
    }));
    if (editing) {
      const r = currentReps.trim() || editing.originalReps;
      const w = currentWeight.trim() || editing.originalWeight;
      if (r && w) {
        allSets.splice(editing.originalIndex, 0, { reps: r, weight: w });
      }
    } else if (currentReps.trim() && currentWeight.trim()) {
      allSets.push({ reps: currentReps.trim(), weight: currentWeight.trim() });
    }
    if (allSets.length > 0) {
      addExercise({
        workoutExerciseId: exercise.workoutExerciseId || Date.now().toString(),
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        bodyParts: exercise.bodyParts,

        sets: allSets,
        note: note.trim(),
      });
    }
  };

  useImperativeHandle(ref, () => ({ save: saveExercise }));

  const handleSave = (callback: () => void) => {
    saveExercise();
    callback();
  };

  const handleLogSet = () => {
    if (!currentReps.trim() || !currentWeight.trim()) return;
    if (editing) {
      const reps = currentReps.trim();
      const weight = currentWeight.trim();
      const editingId = editing.id;
      const insertAt = editing.originalIndex;
      setLoggedSets((prev) => {
        const next = [...prev];
        next.splice(insertAt, 0, { id: editingId, reps, weight });
        return next;
      });
      setCurrentReps(editing.previousReps);
      setCurrentWeight(editing.previousWeight);
      setEditing(null);
      Keyboard.dismiss();
      return;
    }
    setLoggedSets((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        reps: currentReps.trim(),
        weight: currentWeight.trim(),
      },
    ]);
    setCurrentReps("");
    Keyboard.dismiss();
  };

  const handleEditSet = (set: LoggedSet) => {
    let workingSets = loggedSets;
    let stashedPrevReps = currentReps;
    let stashedPrevWeight = currentWeight;

    if (editing) {
      if (editing.id === set.id) return;
      const reps = currentReps.trim() || editing.originalReps;
      const weight = currentWeight.trim() || editing.originalWeight;
      workingSets = [...loggedSets];
      workingSets.splice(editing.originalIndex, 0, {
        id: editing.id,
        reps,
        weight,
      });
      stashedPrevReps = editing.previousReps;
      stashedPrevWeight = editing.previousWeight;
    }

    const idx = workingSets.findIndex((s) => s.id === set.id);
    if (idx < 0) return;

    setLoggedSets(workingSets.filter((s) => s.id !== set.id));
    setEditing({
      id: set.id,
      originalIndex: idx,
      originalReps: set.reps,
      originalWeight: set.weight,
      previousReps: stashedPrevReps,
      previousWeight: stashedPrevWeight,
    });
    setCurrentReps(set.reps);
    setCurrentWeight(set.weight);
  };

  const getDisplayIdx = (arrayIdx: number) =>
    editing && arrayIdx >= editing.originalIndex ? arrayIdx + 1 : arrayIdx;

  const setNumberLabel = editing
    ? editing.originalIndex + 1
    : loggedSets.length + 1;

  useEffect(() => {
    const listener = Keyboard.addListener("keyboardDidHide", () => {
      saveExercise();
    });
    return () => listener.remove();
  }, [loggedSets, currentReps, currentWeight, note, editing]);

  const canLog = !!currentReps.trim() && !!currentWeight.trim();
  const timerValue = showingTotal ? seconds : exerciseSeconds;

  const openNoteModal = () => {
    setNoteDraft(note);
    setNoteModalVisible(true);
  };

  const saveNote = () => {
    setNote(noteDraft);
    setNoteModalVisible(false);
  };

  const handleInfoPress = () => {
    const noteLabel = note.trim() ? "Edit note" : "Add note";
    const viewLabel = "View information";
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [noteLabel, viewLabel, "Cancel"],
          cancelButtonIndex: 2,
          userInterfaceStyle: isDark ? "dark" : "light",
        },
        (i) => {
          if (i === 0) openNoteModal();
          else if (i === 1)
            navigation.navigate("ExerciseHistory", { exercise });
        },
      );
    } else {
      Alert.alert(exercise.name, undefined, [
        { text: noteLabel, onPress: openNoteModal },
        {
          text: viewLabel,
          onPress: () => navigation.navigate("ExerciseHistory", { exercise }),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.bg, paddingTop: insets.top },
          ]}
        >
          <FloatingCloseButton
            onPress={() => {
              const parent = navigation.getParent();
              if (parent) parent.goBack();
              else navigation.goBack();
            }}
          />
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowingTotal((v) => !v)}
              style={styles.timerTap}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Image
                source={stopwatch}
                style={[styles.timerIcon, { tintColor: colors.text }]}
              />
              <Text style={[styles.timerText, { color: colors.text }]}>
                {formatTime(timerValue)}
              </Text>
              {showingTotal && (
                <Text
                  style={[styles.timerCaption, { color: colors.textMuted }]}
                >
                  TOTAL
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleInfoPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.infoButton, { backgroundColor: colors.chipBg }]}
            >
              <SymbolView
                name={note.trim() ? "ellipsis.circle.fill" : "ellipsis.circle"}
                tintColor={colors.text}
                size={18}
              />
            </TouchableOpacity>
          </View>
          <View
            style={[styles.divider, { borderBottomColor: colors.border }]}
          />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={[styles.caption, { color: colors.textMuted }]}>
                EXERCISE {exerciseNum} · SET {setNumberLabel}
              </Text>
              <Text
                style={[styles.title, { color: colors.text }]}
                numberOfLines={2}
              >
                {exercise.name}
              </Text>
            </View>

            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <HeroInput
                label="Reps"
                value={currentReps}
                onChangeText={setCurrentReps}
                colors={colors}
              />
              <View
                style={[styles.heroDivider, { backgroundColor: colors.border }]}
              />
              <HeroInput
                label="Weight"
                unit="lbs"
                value={currentWeight}
                onChangeText={setCurrentWeight}
                colors={colors}
                allowDecimal
              />
              <View
                style={[styles.heroDivider, { backgroundColor: colors.border }]}
              />
              <PlateLoaderToggle
                colors={colors}
                enabled={platesEnabled}
                open={platesOpen}
                onToggleEnabled={togglePlatesEnabled}
                onToggleOpen={() => setPlatesOpen((v) => !v)}
                bar={plateBar}
                sideTotal={plateSideTotal}
                mode={plateMode}
                stackCount={plateStack.length}
              />
              {platesEnabled && platesOpen && (
                <>
                  <View
                    style={[
                      styles.heroDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <PlateLoader
                    colors={colors}
                    isDark={isDark}
                    stack={plateStack}
                    sideTotal={plateSideTotal}
                    bar={plateBar}
                    barOn={plateBarOn}
                    mode={plateMode}
                    onAddPlate={handleAddPlate}
                    onPopPlate={handlePopPlate}
                    onClear={handleClearPlates}
                    onModeChange={handlePlateModeChange}
                    onBarToggle={handlePlateBarToggle}
                  />
                </>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogSet}
              disabled={!canLog}
              style={[
                styles.logButton,
                {
                  backgroundColor: colors.accent,
                  opacity: canLog ? 1 : 0.4,
                },
              ]}
            >
              <Text
                style={[styles.logButtonText, { color: colors.accentText }]}
              >
                {editing ? `Save set ${setNumberLabel}` : `Log set ${setNumberLabel}`}
              </Text>
              <Text
                style={[styles.logButtonArrow, { color: colors.accentText }]}
              >
                →
              </Text>
            </TouchableOpacity>

            <View style={styles.setsSection}>
              <View style={styles.setsHeader}>
                <Text style={[styles.caption, { color: colors.textMuted }]}>
                  SETS
                </Text>
                <TouchableOpacity
                  onPress={() => setExpanded((v) => !v)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={styles.setsToggle}
                >
                  <Text style={[styles.setsCount, { color: colors.textMuted }]}>
                    {loggedSets.length} logged
                  </Text>
                  <Text
                    style={[styles.setsChevron, { color: colors.textMuted }]}
                  >
                    {expanded ? "▴" : "▾"}
                  </Text>
                </TouchableOpacity>
              </View>

              {loggedSets.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textFaint }]}>
                  No sets logged yet
                </Text>
              ) : expanded ? (
                <View>
                  {[...loggedSets].reverse().map((item, index) => (
                    <View key={item.id} style={styles.setRowWrapper}>
                      <ReanimatedSwipeable
                        {...getSwipeableProps(item.id)}
                        containerStyle={stackStyles.swipeContainer}
                      >
                        <SetRow
                          colors={colors}
                          idx={getDisplayIdx(loggedSets.length - 1 - index)}
                          reps={item.reps}
                          weight={item.weight}
                          onEdit={() => handleEditSet(item)}
                        />
                      </ReanimatedSwipeable>
                    </View>
                  ))}
                </View>
              ) : (
                <StackedSets
                  colors={colors}
                  loggedSets={loggedSets}
                  onExpand={() => setExpanded(true)}
                  newestDisplayIdx={getDisplayIdx(loggedSets.length - 1)}
                  onEditNewest={() =>
                    handleEditSet(loggedSets[loggedSets.length - 1])
                  }
                  getSwipeableProps={getSwipeableProps}
                />
              )}
            </View>
          </ScrollView>

          <View
            style={[
              styles.footerCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.footerSecondary}
              onPress={() => handleSave(onSummary)}
            >
              <Text
                style={[styles.footerSecondaryText, { color: colors.text }]}
              >
                Summary
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerPrimary, { backgroundColor: colors.accent }]}
              onPress={() => handleSave(onAddExercise)}
            >
              <Text
                style={[styles.footerPrimaryText, { color: colors.accentText }]}
              >
                Next exercise →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <View style={styles.keyboardToolbar}>
            <View style={{ flex: 1 }} />
            <GlassView style={{ borderRadius: 25, padding: 8 }}>
              <Button title="Done" onPress={() => Keyboard.dismiss()} />
            </GlassView>
          </View>
        </InputAccessoryView>
      )}
      <Modal
        visible={noteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNoteModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[styles.modalCard, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Note
                </Text>
                <TextInput
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  placeholder="Add a note for this exercise"
                  placeholderTextColor={colors.textFaint}
                  multiline
                  autoFocus
                  style={[
                    styles.modalInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.chipBg,
                    },
                  ]}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setNoteModalVisible(false)}
                    style={styles.modalSecondary}
                  >
                    <Text
                      style={[
                        styles.modalSecondaryText,
                        { color: colors.text },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveNote}
                    style={[
                      styles.modalPrimary,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalPrimaryText,
                        { color: colors.accentText },
                      ]}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
});

function HeroInput({
  label,
  value,
  onChangeText,
  unit,
  colors,
  allowDecimal,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  unit?: string;
  colors: ThemeColors;
  allowDecimal?: boolean;
}) {
  return (
    <View style={heroStyles.row}>
      <Text style={[heroStyles.label, { color: colors.textMuted }]}>
        {label}
      </Text>
      <View style={heroStyles.valueRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={allowDecimal ? "decimal-pad" : "number-pad"}
          placeholder="0"
          placeholderTextColor={colors.textFaint}
          inputAccessoryViewID={inputAccessoryViewID}
          maxLength={6}
          style={[heroStyles.input, { color: colors.text }]}
          selectTextOnFocus
        />
        {unit && (
          <Text style={[heroStyles.unit, { color: colors.textFaint }]}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

function SetRow({
  colors,
  idx,
  reps,
  weight,
  onEdit,
}: {
  colors: ThemeColors;
  idx: number;
  reps: string;
  weight: string;
  onEdit?: () => void;
}) {
  return (
    <View
      style={[
        setStyles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[setStyles.idx, { color: colors.textFaint }]}>
        {idx + 1}
      </Text>
      <View style={setStyles.cell}>
        <Text style={[setStyles.value, { color: colors.text }]}>
          {reps}
          <Text style={[setStyles.unit, { color: colors.textFaint }]}>
            {" "}
            reps
          </Text>
        </Text>
      </View>
      <View style={setStyles.cell}>
        <Text style={[setStyles.value, { color: colors.text }]}>
          {weight}
          <Text style={[setStyles.unit, { color: colors.textFaint }]}>
            {" "}
            lbs
          </Text>
        </Text>
      </View>
      {onEdit ? (
        <TouchableOpacity
          onPress={onEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={setStyles.editButton}
        >
          <SymbolView
            name="square.and.pencil"
            tintColor={colors.text}
            size={18}
          />
        </TouchableOpacity>
      ) : (
        <SymbolView
          name="square.and.pencil"
          tintColor={colors.text}
          size={18}
        />
      )}
    </View>
  );
}

function StackedSets({
  colors,
  loggedSets,
  onExpand,
  newestDisplayIdx,
  onEditNewest,
  getSwipeableProps,
}: {
  colors: ThemeColors;
  loggedSets: LoggedSet[];
  onExpand: () => void;
  newestDisplayIdx: number;
  onEditNewest: () => void;
  getSwipeableProps: (id: string) => any;
}) {
  const newest = loggedSets[loggedSets.length - 1];
  const behindCount = Math.min(2, loggedSets.length - 1);
  return (
    <View style={stackStyles.container}>
      {Array.from({ length: behindCount }).map((_, bi) => {
        const depth = bi + 1;
        return (
          <View
            key={bi}
            style={[
              stackStyles.behind,
              {
                left: 10 + depth * 6,
                right: 10 + depth * 6,
                top: depth * 6,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: 1 - depth * 0.22,
              },
            ]}
          />
        );
      })}
      <View style={stackStyles.top}>
        <ReanimatedSwipeable
          {...getSwipeableProps(newest.id)}
          containerStyle={stackStyles.swipeContainer}
        >
          <SetRow
            colors={colors}
            idx={newestDisplayIdx}
            reps={newest.reps}
            weight={newest.weight}
            onEdit={onEditNewest}
          />
        </ReanimatedSwipeable>
      </View>
      {loggedSets.length > 1 && (
        <TouchableOpacity onPress={onExpand} style={stackStyles.expand}>
          <Text style={[stackStyles.expandText, { color: colors.textMuted }]}>
            ▾ Tap to expand
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PlateToggleSwitch({
  enabled,
  colors,
  onPress,
}: {
  enabled: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[
        plateStyles.switchTrack,
        { backgroundColor: enabled ? colors.text : colors.stepperBorder },
      ]}
    >
      <View
        style={[
          plateStyles.switchThumb,
          {
            backgroundColor: enabled ? colors.bg : "#fff",
            left: enabled ? 18 : 2,
          },
        ]}
      />
    </TouchableOpacity>
  );
}

function PlateLoaderToggle({
  colors,
  enabled,
  open,
  onToggleEnabled,
  onToggleOpen,
  bar,
  sideTotal,
  mode,
  stackCount,
}: {
  colors: ThemeColors;
  enabled: boolean;
  open: boolean;
  onToggleEnabled: () => void;
  onToggleOpen: () => void;
  bar: number;
  sideTotal: number;
  mode: PlateMode;
  stackCount: number;
}) {
  const summary = (() => {
    if (!enabled) return null;
    if (stackCount === 0 && bar === 0) return "Empty";
    if (stackCount === 0) return `${bar} bar`;
    return plateMath(bar, sideTotal, mode);
  })();

  return (
    <View style={plateStyles.toggleRow}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={enabled ? onToggleOpen : onToggleEnabled}
        style={plateStyles.toggleLabelArea}
      >
        <Text style={[plateStyles.toggleOverline, { color: colors.textMuted }]}>
          PLATE LOADED
        </Text>
        {enabled && summary && (
          <Text
            style={[plateStyles.toggleSummary, { color: colors.textFaint }]}
          >
            {summary}
          </Text>
        )}
      </TouchableOpacity>
      <View style={plateStyles.toggleControls}>
        {enabled && (
          <SymbolView
            name={open ? "chevron.up" : "chevron.down"}
            tintColor={colors.textMuted}
            size={12}
          />
        )}
        <PlateToggleSwitch
          enabled={enabled}
          colors={colors}
          onPress={onToggleEnabled}
        />
      </View>
    </View>
  );
}

function PlateLoader({
  colors,
  isDark,
  stack,
  sideTotal,
  bar,
  barOn,
  mode,
  onAddPlate,
  onPopPlate,
  onClear,
  onModeChange,
  onBarToggle,
}: {
  colors: ThemeColors;
  isDark: boolean;
  stack: number[];
  sideTotal: number;
  bar: number;
  barOn: boolean;
  mode: PlateMode;
  onAddPlate: (p: number) => void;
  onPopPlate: () => void;
  onClear: () => void;
  onModeChange: (m: PlateMode) => void;
  onBarToggle: () => void;
}) {
  const reverseStack = [...stack].reverse();
  const summary = plateMath(bar, sideTotal, mode);
  const slideAnim = useRef(new Animated.Value(mode === "dual" ? 0 : 1)).current;
  const [segmentedWidth, setSegmentedWidth] = useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: mode === "dual" ? 0 : 1,
      useNativeDriver: true,
      stiffness: 220,
      damping: 22,
      mass: 0.8,
    }).start();
  }, [mode, slideAnim]);

  const indicatorWidth = segmentedWidth ? (segmentedWidth - 6) / 2 : 0;
  const indicatorTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, indicatorWidth],
  });

  return (
    <View style={plateStyles.loader}>
      <View
        onLayout={(e) => setSegmentedWidth(e.nativeEvent.layout.width)}
        style={[
          plateStyles.segmented,
          {
            backgroundColor: colors.stepperBg,
            borderColor: colors.stepperBorder,
          },
        ]}
      >
        {indicatorWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              plateStyles.segmentedIndicator,
              {
                width: indicatorWidth,
                backgroundColor: colors.accent,
                transform: [{ translateX: indicatorTranslateX }],
                shadowColor: isDark ? "#fff" : "#000",
                shadowOpacity: isDark ? 0.04 : 0.06,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 2,
              },
            ]}
          />
        )}
        {(["dual", "single"] as PlateMode[]).map((m) => {
          const active = mode === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => onModeChange(m)}
              activeOpacity={0.7}
              style={plateStyles.segmentedItem}
            >
              <Text
                style={[
                  plateStyles.segmentedText,
                  { color: active ? colors.accentText : colors.textMuted },
                ]}
              >
                {m === "dual" ? "Dual side" : "Single side"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={plateStyles.barRow}>
        <Text style={[plateStyles.barRowLabel, { color: colors.text }]}>
          Include bar
          <Text style={{ color: colors.textFaint, fontWeight: "400" }}>
            {"  "}
            {barOn ? `+${BAR_WEIGHT}` : "—"}
          </Text>
        </Text>
        <PlateToggleSwitch
          enabled={barOn}
          colors={colors}
          onPress={onBarToggle}
        />
      </View>

      <TouchableOpacity
        activeOpacity={stack.length ? 0.7 : 1}
        onPress={onPopPlate}
        style={plateStyles.visual}
      >
        {mode === "dual" ? (
          <>
            <View style={plateStyles.visualSideLeft}>
              {reverseStack.map((p, i) => (
                <View
                  key={`l${i}`}
                  style={[
                    plateStyles.plateBar,
                    {
                      height: PLATE_HEIGHTS[String(p)] ?? 22,
                      backgroundColor: colors.text,
                    },
                  ]}
                />
              ))}
            </View>
            <View
              style={[plateStyles.visualBar, { opacity: barOn ? 1 : 0.35 }]}
            >
              <View
                style={[
                  plateStyles.barCap,
                  { backgroundColor: colors.textMuted },
                ]}
              />
              <View
                style={[
                  plateStyles.barShaftDual,
                  { backgroundColor: colors.text },
                ]}
              />
              <View
                style={[
                  plateStyles.barCap,
                  { backgroundColor: colors.textMuted },
                ]}
              />
            </View>
            <View style={plateStyles.visualSideRight}>
              {stack.map((p, i) => (
                <View
                  key={`r${i}`}
                  style={[
                    plateStyles.plateBar,
                    {
                      height: PLATE_HEIGHTS[String(p)] ?? 22,
                      backgroundColor: colors.text,
                    },
                  ]}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={plateStyles.visualSideLeftEmpty} />
            <View
              style={[plateStyles.visualBar, { opacity: barOn ? 1 : 0.35 }]}
            >
              <View
                style={[
                  plateStyles.pivotDot,
                  { backgroundColor: colors.textMuted },
                ]}
              />
              <View
                style={[
                  plateStyles.barShaftSingle,
                  { backgroundColor: colors.text },
                ]}
              />
              <View
                style={[
                  plateStyles.singleBarCap,
                  { backgroundColor: colors.textMuted },
                ]}
              />
            </View>
            <View style={plateStyles.visualSideRight}>
              {stack.map((p, i) => (
                <View
                  key={`s${i}`}
                  style={[
                    plateStyles.plateBar,
                    {
                      height: PLATE_HEIGHTS[String(p)] ?? 22,
                      backgroundColor: colors.text,
                    },
                  ]}
                />
              ))}
            </View>
          </>
        )}
      </TouchableOpacity>

      <View style={plateStyles.plateGrid}>
        {[...PLATE_OPTIONS].reverse().map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => onAddPlate(p)}
            activeOpacity={0.7}
            style={[
              plateStyles.plateButton,
              {
                backgroundColor: colors.stepperBg,
                borderColor: colors.stepperBorder,
              },
            ]}
          >
            <Text style={[plateStyles.plateButtonText, { color: colors.text }]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={plateStyles.actionsRow}>
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[plateStyles.actionText, { color: colors.textMuted }]}>
            Clear
          </Text>
        </TouchableOpacity>
        <Text style={[plateStyles.summaryText, { color: colors.textFaint }]}>
          {summary}
        </Text>
        <TouchableOpacity
          onPress={onPopPlate}
          disabled={stack.length === 0}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text
            style={[
              plateStyles.actionText,
              {
                color: stack.length === 0 ? colors.textFaint : colors.textMuted,
              },
            ]}
          >
            Remove last
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 0,
  },

  topBar: {
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  timerTap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },

  timerIcon: { width: 22, height: 22 },
  timerText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  timerCaption: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginLeft: 4,
  },

  infoButton: {
    position: "absolute",
    right: 20,
    top: "50%",
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },

  caption: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 36,
  },

  heroCard: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
  },

  heroDivider: {
    height: StyleSheet.hairlineWidth,
  },

  logButton: {
    marginHorizontal: 20,
    marginBottom: 18,
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  logButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  logButtonArrow: {
    fontSize: 17,
    opacity: 0.6,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 8,
  },

  setsSection: {
    paddingHorizontal: 20,
  },

  setsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginBottom: 4,
  },

  setsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },

  setsCount: {
    fontSize: 12,
    fontWeight: "500",
  },

  setsChevron: {
    fontSize: 11,
  },

  empty: {
    textAlign: "center",
    paddingVertical: 14,
    fontSize: 13,
  },

  setRowWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 12,
  },

  modalInput: {
    minHeight: 100,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },

  modalSecondary: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  modalSecondaryText: {
    fontSize: 15,
    fontWeight: "500",
  },

  modalPrimary: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  modalPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
  },

  footerCard: {
    marginHorizontal: 12,
    marginBottom: 20,
    padding: 6,
    borderRadius: 16,
    flexDirection: "row",
    gap: 4,
  },

  footerSecondary: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  footerSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  footerPrimary: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  footerPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  keyboardToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

const heroStyles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  input: {
    flex: 1,
    fontSize: 84,
    fontWeight: "700",
    letterSpacing: -3,
    lineHeight: 90,
    padding: 0,
    margin: 0,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    fontSize: 22,
    fontWeight: "500",
    marginLeft: 8,
  },
});

const setStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  idx: {
    width: 24,
    fontSize: 13,
    fontWeight: "600",
  },
  cell: {
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  unit: {
    fontSize: 12,
    fontWeight: "400",
  },
  editButton: {
    padding: 4,
    marginRight: -4,
  },
});

const stackStyles = StyleSheet.create({
  container: {
    position: "relative",
    paddingBottom: 28,
  },
  behind: {
    position: "absolute",
    height: 60,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  top: {
    zIndex: 3,
  },
  swipeContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  expand: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  expandText: {
    fontSize: 12,
  },
});

const plateStyles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  toggleLabelArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleOverline: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  toggleSummary: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  toggleControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchTrack: {
    width: 38,
    height: 22,
    borderRadius: 11,
    position: "relative",
  },
  switchThumb: {
    position: "absolute",
    top: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  loader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    marginBottom: 4,
    position: "relative",
  },
  segmentedIndicator: {
    position: "absolute",
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 8,
  },
  segmentedItem: {
    flex: 1,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingTop: 10,
    paddingBottom: 14,
  },
  barRowLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  visual: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
  visualSideLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },
  visualSideRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 2,
  },
  visualSideLeftEmpty: {
    flex: 1,
  },
  visualBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  barCap: {
    width: 14,
    height: 4,
    borderRadius: 1,
  },
  barShaftDual: {
    width: 36,
    height: 8,
    borderRadius: 2,
  },
  barShaftSingle: {
    width: 60,
    height: 6,
    borderRadius: 1.5,
  },
  pivotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  singleBarCap: {
    width: 12,
    height: 4,
    borderRadius: 1,
  },
  plateBar: {
    width: 6,
    borderRadius: 1.5,
  },
  plateGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  plateButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  plateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
    paddingVertical: 4,
  },
  summaryText: {
    fontSize: 11,
    letterSpacing: 0.4,
    fontVariant: ["tabular-nums"],
  },
});
