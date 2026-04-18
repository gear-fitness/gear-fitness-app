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
import { Swipeable, ScrollView } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import stopwatch from "../assets/stopwatch.png";
import { useWorkoutTimer, WorkoutSet } from "../context/WorkoutContext";
import { useSwipeableDelete } from "../hooks/useSwipeableDelete";

interface ExerciseDetailContentProps {
  exercise: {
    exerciseId: string;
    name: string;
    workoutExerciseId?: string;
    sets?: WorkoutSet[];
    note?: string;
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
};

type LoggedSet = WorkoutSet & { id: string };

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
        accent: "#0A84FF",
        accentText: "#fff",
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
        accent: "#007AFF",
        accentText: "#fff",
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

  useEffect(() => {
    const id = setInterval(
      () => setExerciseSeconds((s) => s + 1),
      1000,
    );
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
    onDelete: (id) =>
      setLoggedSets((prev) => prev.filter((s) => s.id !== id)),
    deleteTitle: "Delete Set",
    deleteMessage: "Are you sure you want to delete this set?",
  });

  const saveExercise = () => {
    const pending: WorkoutSet[] =
      currentReps.trim() && currentWeight.trim()
        ? [{ reps: currentReps.trim(), weight: currentWeight.trim() }]
        : [];
    const allSets: WorkoutSet[] = [
      ...loggedSets.map(({ reps, weight }) => ({ reps, weight })),
      ...pending,
    ];
    if (allSets.length > 0) {
      addExercise({
        workoutExerciseId:
          exercise.workoutExerciseId || Date.now().toString(),
        exerciseId: exercise.exerciseId,
        name: exercise.name,
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

  useEffect(() => {
    const listener = Keyboard.addListener("keyboardDidHide", () => {
      saveExercise();
    });
    return () => listener.remove();
  }, [loggedSets, currentReps, currentWeight, note]);

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
          onPress: () =>
            navigation.navigate("ExerciseHistory", { exercise }),
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
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.dismissButton, { backgroundColor: colors.chipBg }]}
          >
            <SymbolView
              name="chevron.down"
              tintColor={colors.text}
              size={16}
            />
          </TouchableOpacity>
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
        <View style={[styles.divider, { borderBottomColor: colors.border }]} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <Text style={[styles.caption, { color: colors.textMuted }]}>
            EXERCISE {exerciseNum} · SET {loggedSets.length + 1}
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
            style={[
              styles.heroDivider,
              { backgroundColor: colors.border },
            ]}
          />
          <HeroInput
            label="Weight"
            unit="lbs"
            value={currentWeight}
            onChangeText={setCurrentWeight}
            colors={colors}
            allowDecimal
          />
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
          <Text style={[styles.logButtonText, { color: colors.accentText }]}>
            Log set {loggedSets.length + 1}
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
              <Text style={[styles.setsChevron, { color: colors.textMuted }]}>
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
                  <Swipeable
                    {...getSwipeableProps(item.id)}
                    activeOffsetX={[-15, 15]}
                    failOffsetY={[-10, 10]}
                  >
                    <SetRow
                      colors={colors}
                      idx={loggedSets.length - 1 - index}
                      reps={item.reps}
                      weight={item.weight}
                    />
                  </Swipeable>
                </View>
              ))}
            </View>
          ) : (
            <StackedSets
              colors={colors}
              loggedSets={loggedSets}
              onExpand={() => setExpanded(true)}
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
            style={[
              styles.footerPrimary,
              { backgroundColor: colors.accent },
            ]}
            onPress={() => handleSave(onAddExercise)}
          >
            <Text
              style={[
                styles.footerPrimaryText,
                { color: colors.accentText },
              ]}
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
        <TouchableWithoutFeedback
          onPress={() => setNoteModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: colors.surface },
                ]}
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
}: {
  colors: ThemeColors;
  idx: number;
  reps: string;
  weight: string;
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
      <SymbolView name="checkmark" tintColor={colors.text} size={14} />
    </View>
  );
}

function StackedSets({
  colors,
  loggedSets,
  onExpand,
}: {
  colors: ThemeColors;
  loggedSets: LoggedSet[];
  onExpand: () => void;
}) {
  const newest = loggedSets[loggedSets.length - 1];
  const newestIdx = loggedSets.length - 1;
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
        <SetRow
          colors={colors}
          idx={newestIdx}
          reps={newest.reps}
          weight={newest.weight}
        />
      </View>
      {loggedSets.length > 1 && (
        <TouchableOpacity onPress={onExpand} style={stackStyles.expand}>
          <Text
            style={[stackStyles.expandText, { color: colors.textMuted }]}
          >
            ▾ Tap to expand
          </Text>
        </TouchableOpacity>
      )}
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

  dismissButton: {
    position: "absolute",
    left: 20,
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
