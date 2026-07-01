import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Text,
  Keyboard,
  Modal,
  Animated,
  Alert,
  useColorScheme,
} from "react-native";
import { sharedDetailStyles, detailHeroStyles } from "./detailContentStyles";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
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
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import stopwatch from "../assets/stopwatch.png";
import { useWorkoutTimer, WorkoutSet } from "../context/WorkoutContext";
import { useUnitPreference } from "../context/UnitPreferenceContext";
import { toDisplayWeight, toLbs, type WeightUnit } from "../utils/weight";
import { useSwipeableDelete } from "../hooks/useSwipeableDelete";
import { BodyPartDTO } from "../api/exerciseService";
import { FloatingCloseButton } from "./FloatingCloseButton";
import { FloatingKeyboardDismiss } from "./FloatingKeyboardDismiss";

interface ExerciseDetailContentProps {
  exercise: {
    exerciseId: string;
    name: string;
    workoutExerciseId?: string;
    sets?: WorkoutSet[];
    note?: string;
    bodyParts?: BodyPartDTO[];
    durationSeconds?: number;
    draftReps?: string;
    draftWeight?: string;
    weightUnit?: WeightUnit;
  };
  onSummary: () => void;
  onAddExercise: () => void;
  onSwapExercise?: () => void;
  isInPlayer?: boolean;
}

export interface ExerciseDetailContentRef {
  save: () => void;
}

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

// Standard Olympic plate sets and bar weights, in the unit being used. Plate
// loading is a physical concept, so the kg user gets kg plates/bar — not a
// converted lb set. The hero weight input and these constants share the same
// unit (the user's display unit); conversion to canonical lbs happens only
// when a set is committed.
const BAR_WEIGHT_LBS = 45;
const BAR_WEIGHT_KG = 20;
const PLATE_OPTIONS_LBS = [45, 35, 25, 10, 5, 2.5];
const PLATE_OPTIONS_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
// Visual bar heights by plate rank (largest plate → tallest), so a single
// table works for both unit systems regardless of the plates' face values.
const PLATE_BAR_HEIGHTS = [36, 32, 28, 24, 20, 16, 12];

function barWeightFor(unit: WeightUnit): number {
  return unit === "kg" ? BAR_WEIGHT_KG : BAR_WEIGHT_LBS;
}

function plateOptionsFor(unit: WeightUnit): number[] {
  return unit === "kg" ? PLATE_OPTIONS_KG : PLATE_OPTIONS_LBS;
}

function plateHeight(p: number, plateOptions: number[]): number {
  const i = plateOptions.indexOf(p);
  return i >= 0 ? (PLATE_BAR_HEIGHTS[i] ?? 22) : 22;
}

type PlateMode = "dual" | "single";

function platesFromWeight(
  weight: string,
  mode: PlateMode,
  bar: number,
  plateOptions: number[],
): number[] {
  const divisor = mode === "single" ? 1 : 2;
  let remaining = Math.max(0, (Number(weight || 0) - bar) / divisor);
  const stack: number[] = [];
  for (const p of plateOptions) {
    while (remaining >= p - 0.0001) {
      stack.push(p);
      remaining -= p;
    }
  }
  return stack;
}

function roundToPlateWeight(
  weight: number,
  mode: PlateMode,
  bar: number,
  plateOptions: number[],
): number {
  const divisor = mode === "single" ? 1 : 2;
  const smallest = plateOptions[plateOptions.length - 1];
  const perSide = Math.max(0, (weight - bar) / divisor);
  const roundedSide = Math.round(perSide / smallest) * smallest;
  return bar + roundedSide * divisor;
}

function formatWeight(n: number): string {
  if (!isFinite(n)) return "0";
  return n % 1 === 0 ? String(n) : Number(n.toFixed(2)).toString();
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
>(({ exercise, onSummary, onAddExercise, onSwapExercise }, ref) => {
  const {
    seconds,
    exercises,
    addExercise,
    activeExerciseId,
    activeExerciseStartedAt,
  } = useWorkoutTimer();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const glassAvailable = isLiquidGlassAvailable();
  const { weightUnit: globalUnit } = useUnitPreference();
  // Per-exercise unit override, scoped to this workout (persisted on the
  // WorkoutExercise, not globally). Lets you log everything in lbs but track,
  // say, bench in kg. Resets to the global Settings unit for the next workout.
  const [overrideUnit, setOverrideUnit] = useState<WeightUnit | undefined>(
    exercise.weightUnit,
  );
  const weightUnit = overrideUnit ?? globalUnit;

  // The hero weight input (currentWeight) and draftWeight are held in the
  // user's display unit; everything persisted — loggedSets, WorkoutSet, and the
  // submitted payload — stays canonical lbs. Convert only at this boundary.
  const BAR_WEIGHT = barWeightFor(weightUnit);
  const PLATE_OPTIONS = plateOptionsFor(weightUnit);
  const lbsToInput = (lbs: string): string => {
    const n = Number(lbs);
    if (!lbs || lbs.trim() === "" || Number.isNaN(n)) return "";
    return String(toDisplayWeight(n, weightUnit));
  };
  const inputToLbs = (display: string): string => {
    const n = Number(display);
    if (display.trim() === "" || Number.isNaN(n)) return "";
    return String(toLbs(n, weightUnit));
  };

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
  const [currentReps, setCurrentReps] = useState(exercise.draftReps ?? "");
  const [currentWeight, setCurrentWeight] = useState(
    exercise.draftWeight ?? "",
  );
  const [note, setNote] = useState(exercise.note || "");
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [showingTotal, setShowingTotal] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [platesEnabled, setPlatesEnabled] = useState(false);
  const [platesOpen, setPlatesOpen] = useState(false);
  const [plateMode, setPlateMode] = useState<PlateMode>("dual");
  const [plateBarOn, setPlateBarOn] = useState(false);
  const [editing, setEditing] = useState<EditingState>(null);

  const plateBar = plateBarOn ? BAR_WEIGHT : 0;
  const plateMultiplier = plateMode === "single" ? 1 : 2;
  const plateStack = platesFromWeight(
    currentWeight,
    plateMode,
    plateBar,
    PLATE_OPTIONS,
  );
  const plateSideTotal = plateStack.reduce((a, b) => a + b, 0);

  const togglePlatesEnabled = () => {
    const next = !platesEnabled;
    setPlatesEnabled(next);
    setPlatesOpen(next);
    if (next) {
      const current = Number(currentWeight || 0);
      if (current > 0) {
        const useBar = current >= BAR_WEIGHT;
        const bar = useBar ? BAR_WEIGHT : 0;
        setPlateBarOn(useBar);
        setCurrentWeight(
          formatWeight(
            roundToPlateWeight(current, plateMode, bar, PLATE_OPTIONS),
          ),
        );
      } else {
        setCurrentWeight(formatWeight(plateBar));
      }
    }
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

  // Tapping the unit label flips THIS exercise's unit for the current workout
  // (not the app-wide default — that lives in Settings). The in-progress input
  // is converted so the physical weight is preserved (e.g. 100 lbs → 45 kg).
  // Logged sets are stored in canonical lbs and re-render in the new unit
  // automatically; the plate calculator switches to that unit's plates. The
  // override is workout-scoped and resets to the global default next workout.
  const handleToggleUnit = () => {
    const next: WeightUnit = weightUnit === "kg" ? "lbs" : "kg";
    const n = Number(currentWeight);
    const converted =
      currentWeight.trim() !== "" && !Number.isNaN(n)
        ? String(toDisplayWeight(toLbs(n, weightUnit), next))
        : currentWeight;
    setCurrentWeight(converted);
    setOverrideUnit(next);
    // Persist atomically so a save racing this toggle can't drop the unit or
    // the freshly-converted draft.
    saveExercise({ weightUnit: next, draftWeight: converted });
  };

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isActiveExercise =
    !!exercise.workoutExerciseId &&
    activeExerciseId === exercise.workoutExerciseId;
  const liveDelta =
    isActiveExercise && activeExerciseStartedAt !== null
      ? Math.max(0, Math.floor((now - activeExerciseStartedAt) / 1000))
      : 0;
  const exerciseSeconds = (exercise.durationSeconds ?? 0) + liveDelta;

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
      const nextLogged = loggedSets.filter((s) => s.id !== id);
      setLoggedSets(nextLogged);
      if (editing && idx < editing.originalIndex) {
        setEditing((e) =>
          e ? { ...e, originalIndex: e.originalIndex - 1 } : e,
        );
      }
      // Persist with the new state explicitly — addExercise is write-through.
      saveExercise({
        sets: nextLogged.map(({ reps, weight }) => ({ reps, weight })),
      });
    },
    deleteTitle: "Delete Set",
    deleteMessage: "Are you sure you want to delete this set?",
  });

  // `overrides` lets discrete callers (Log Set, edit, delete) pass the new
  // state explicitly, bypassing React's batched-setState closure staleness.
  // Without this, a save triggered right after setLoggedSets/setCurrentReps
  // would persist the PRE-update values — which is the root cause of the
  // "logged set returns to the hero on kill" bug.
  const saveExercise = (overrides?: {
    sets?: WorkoutSet[];
    draftReps?: string;
    draftWeight?: string;
    weightUnit?: WeightUnit;
  }) => {
    let allSets: WorkoutSet[];
    if (overrides?.sets) {
      allSets = overrides.sets;
    } else {
      allSets = loggedSets.map(({ reps, weight }) => ({
        reps,
        weight,
      }));
      if (editing) {
        const r = currentReps.trim() || editing.originalReps;
        // currentWeight is in the display unit; originalWeight is already lbs.
        const w = currentWeight.trim()
          ? inputToLbs(currentWeight.trim())
          : editing.originalWeight;
        if (r && w) {
          allSets.splice(editing.originalIndex, 0, { reps: r, weight: w });
        }
      }
    }
    const setsToPersist: WorkoutSet[] =
      allSets.length > 0 ? allSets : [{ reps: "", weight: "" }];
    addExercise({
      workoutExerciseId: exercise.workoutExerciseId || Date.now().toString(),
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      bodyParts: exercise.bodyParts,
      sets: setsToPersist,
      note: note.trim(),
      durationSeconds: exercise.durationSeconds,
      draftReps: overrides?.draftReps ?? currentReps,
      draftWeight: overrides?.draftWeight ?? currentWeight,
      weightUnit: overrides?.weightUnit ?? overrideUnit,
    });
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
      // Persisted set weight is canonical lbs; the input is in the display unit.
      const weight = inputToLbs(currentWeight.trim());
      const editingId = editing.id;
      const insertAt = editing.originalIndex;
      const previousReps = editing.previousReps;
      const previousWeight = editing.previousWeight;
      const nextLogged = [...loggedSets];
      nextLogged.splice(insertAt, 0, { id: editingId, reps, weight });
      setLoggedSets(nextLogged);
      setCurrentReps(previousReps);
      setCurrentWeight(previousWeight);
      setEditing(null);
      Keyboard.dismiss();
      // Pass the new state explicitly — addExercise is write-through, but it
      // would otherwise read stale closure values from loggedSets/currentReps.
      saveExercise({
        sets: nextLogged.map(({ reps: r, weight: w }) => ({
          reps: r,
          weight: w,
        })),
        draftReps: previousReps,
        draftWeight: previousWeight,
      });
      return;
    }
    const nextLogged: LoggedSet[] = [
      ...loggedSets,
      {
        id: Date.now().toString(),
        reps: currentReps.trim(),
        // Store canonical lbs; the input is in the display unit.
        weight: inputToLbs(currentWeight.trim()),
      },
    ];
    setLoggedSets(nextLogged);
    setCurrentReps("");
    Keyboard.dismiss();
    saveExercise({
      sets: nextLogged.map(({ reps, weight }) => ({ reps, weight })),
      draftReps: "",
      draftWeight: currentWeight,
    });
  };

  const handleEditSet = (set: LoggedSet) => {
    let workingSets = loggedSets;
    let stashedPrevReps = currentReps;
    let stashedPrevWeight = currentWeight;

    if (editing) {
      if (editing.id === set.id) return;
      const reps = currentReps.trim() || editing.originalReps;
      // currentWeight is in the display unit; originalWeight is already lbs.
      const weight = currentWeight.trim()
        ? inputToLbs(currentWeight.trim())
        : editing.originalWeight;
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
    // Stored set weight is canonical lbs; show it in the display unit.
    setCurrentWeight(lbsToInput(set.weight));
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
    navigation.navigate("ExerciseHistory", { exercise });
  };

  const handleSwapPress = () => {
    if (!onSwapExercise) return;
    Alert.alert("Swap exercise?", "All current exercise data will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Swap",
        style: "destructive",
        onPress: () => onSwapExercise(),
      },
    ]);
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
            <View style={styles.topBarActions}>
              <TouchableOpacity
                onPress={openNoteModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.topBarButton,
                  {
                    backgroundColor: glassAvailable
                      ? "transparent"
                      : colors.chipBg,
                    borderColor: glassAvailable ? "transparent" : colors.border,
                    borderWidth: glassAvailable ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                {glassAvailable && (
                  <GlassView
                    style={[
                      StyleSheet.absoluteFillObject,
                      { borderRadius: 20 },
                    ]}
                    glassEffectStyle="regular"
                    isInteractive
                  />
                )}
                <SymbolView
                  name={note.trim() ? "note.text" : "square.and.pencil"}
                  tintColor={colors.text}
                  size={20}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleInfoPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.topBarButton,
                  {
                    backgroundColor: glassAvailable
                      ? "transparent"
                      : colors.chipBg,
                    borderColor: glassAvailable ? "transparent" : colors.border,
                    borderWidth: glassAvailable ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                {glassAvailable && (
                  <GlassView
                    style={[
                      StyleSheet.absoluteFillObject,
                      { borderRadius: 20 },
                    ]}
                    glassEffectStyle="regular"
                    isInteractive
                  />
                )}
                <SymbolView
                  name="chart.xyaxis.line"
                  tintColor={colors.text}
                  size={20}
                />
              </TouchableOpacity>
            </View>
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
              <TouchableOpacity
                onPress={handleSwapPress}
                activeOpacity={0.6}
                disabled={!onSwapExercise}
                style={styles.titleRow}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text
                  style={[styles.title, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {exercise.name}
                </Text>
                {onSwapExercise && (
                  <SymbolView
                    name="arrow.left.arrow.right"
                    tintColor={colors.textMuted}
                    size={22}
                    style={styles.titleSwapIcon}
                  />
                )}
              </TouchableOpacity>
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
                unit={weightUnit}
                value={currentWeight}
                onChangeText={setCurrentWeight}
                colors={colors}
                allowDecimal
                onUnitPress={handleToggleUnit}
              />
              <View
                style={[styles.heroDivider, { backgroundColor: colors.border }]}
              />
              <PlateLoaderToggle
                colors={colors}
                enabled={platesEnabled}
                onToggleEnabled={togglePlatesEnabled}
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
                    barWeight={BAR_WEIGHT}
                    plateOptions={PLATE_OPTIONS}
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
                {editing
                  ? `Save set ${setNumberLabel}`
                  : `Log set ${setNumberLabel}`}
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
                          unit={weightUnit}
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
                  unit={weightUnit}
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
      <FloatingKeyboardDismiss />
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

function EditPencilIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h4l10-10-4-4L4 16v4z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M13.5 6.5l4 4"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function HeroInput({
  label,
  value,
  onChangeText,
  unit,
  colors,
  allowDecimal,
  onUnitPress,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  unit?: string;
  colors: ThemeColors;
  allowDecimal?: boolean;
  onUnitPress?: () => void;
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
          maxLength={6}
          style={[heroStyles.input, { color: colors.text }]}
          selectTextOnFocus
        />
        {unit &&
          (onUnitPress ? (
            <TouchableOpacity
              onPress={onUnitPress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={`Weight unit: ${unit}. Tap to change.`}
            >
              <Text style={[heroStyles.unit, { color: colors.textFaint }]}>
                {unit}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[heroStyles.unit, { color: colors.textFaint }]}>
              {unit}
            </Text>
          ))}
      </View>
    </View>
  );
}

function SetRow({
  colors,
  idx,
  reps,
  weight,
  unit,
  onEdit,
}: {
  colors: ThemeColors;
  idx: number;
  reps: string;
  weight: string;
  unit: WeightUnit;
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
          {toDisplayWeight(Number(weight) || 0, unit)}
          <Text style={[setStyles.unit, { color: colors.textFaint }]}>
            {" "}
            {unit}
          </Text>
        </Text>
      </View>
      {onEdit ? (
        <TouchableOpacity
          onPress={onEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={setStyles.editButton}
        >
          <EditPencilIcon color={colors.text} />
        </TouchableOpacity>
      ) : (
        <EditPencilIcon color={colors.text} />
      )}
    </View>
  );
}

function StackedSets({
  colors,
  loggedSets,
  unit,
  onExpand,
  newestDisplayIdx,
  onEditNewest,
  getSwipeableProps,
}: {
  colors: ThemeColors;
  loggedSets: LoggedSet[];
  unit: WeightUnit;
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
            unit={unit}
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
  onToggleEnabled,
  bar,
  sideTotal,
  mode,
  stackCount,
}: {
  colors: ThemeColors;
  enabled: boolean;
  onToggleEnabled: () => void;
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
      <View style={plateStyles.toggleLabelArea}>
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
      </View>
      <View style={plateStyles.toggleControls}>
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
  barWeight,
  plateOptions,
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
  barWeight: number;
  plateOptions: number[];
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
            {barOn ? `+${barWeight}` : "—"}
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
                      height: plateHeight(p, plateOptions),
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
                      height: plateHeight(p, plateOptions),
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
                      height: plateHeight(p, plateOptions),
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
        {[...plateOptions].reverse().map((p) => (
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

const exerciseLocalStyles = StyleSheet.create({
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
});

// Shared screen chrome lives in detailContentStyles and is spread in here; the
// keys above are lifting-specific (sets list, log button, empty state). Call
// sites stay styles.* and the merge keeps every key.
const styles = { ...sharedDetailStyles, ...exerciseLocalStyles };

const heroStyles = detailHeroStyles;

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
