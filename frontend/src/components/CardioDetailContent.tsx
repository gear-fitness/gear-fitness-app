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
  Alert,
  useColorScheme,
} from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { ScrollView } from "react-native-gesture-handler";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import stopwatch from "../assets/stopwatch.png";
import { useWorkoutTimer, CardioEntry } from "../context/WorkoutContext";
import { FloatingCloseButton } from "./FloatingCloseButton";
import { FloatingKeyboardDismiss } from "./FloatingKeyboardDismiss";

/**
 * CardioDetailContent
 *
 * Visual sibling of ExerciseDetailContent — same background, hero card,
 * typography, top bar, and footer. Distance/calories/intensity are optional
 * "chip" fields that expand into hero-sized inputs (same scale as Reps/Weight).
 * All data still flows through the WorkoutContext cardio stopwatch +
 * addCardioEntry; the chip values are local edit state seeded from the entry.
 */

export type ChipKey = "distance" | "calories" | "intensity";

export interface ChipFieldState {
  /** Whether the chip is toggled on and its field is expanded. */
  selected: boolean;
  /** Current value typed into the expanded field. */
  value: string;
}

export type ChipValues = Record<ChipKey, ChipFieldState>;

interface CardioDetailContentProps {
  cardio: {
    workoutCardioId: string;
    cardioActivityId: string;
    activityType: string;
    durationSeconds?: number;
    distance?: string;
    calories?: string;
    intensity?: string;
    note?: string;
  };
  onSummary: () => void;
  onAddCardio: () => void;
  onSwapCardio?: () => void;
}

export interface CardioDetailContentRef {
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
  accent: string;
  accentText: string;
  stepperBg: string;
  stepperBorder: string;
};

const CHIP_CONFIG: { key: ChipKey; label: string; unit?: string }[] = [
  { key: "distance", label: "Distance", unit: "mi" },
  { key: "calories", label: "Calories", unit: "cal" },
  { key: "intensity", label: "Intensity" },
];

const INTENSITY_TOOLTIP =
  "A single number for how hard the effort was — use whatever your machine shows: treadmill incline %, bike resistance level, elliptical ramp, etc. Leave blank if not applicable.";

const formatTime = (t: number) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
    2,
    "0",
  )}`;

// MM:SS "fill-through" input, iOS-timer style: digits accumulate from the right
// (the last two are seconds, the rest minutes). "1530" -> 15:30, "130" -> 01:30.
function digitsToParts(digits: string): { mm: string; ss: string } {
  const padded = digits.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return { mm: padded.slice(0, 2), ss: padded.slice(2) };
}

function digitsToDisplay(digits: string): string {
  const { mm, ss } = digitsToParts(digits);
  return `${mm}:${ss}`;
}

function digitsToSeconds(digits: string): number {
  const { mm, ss } = digitsToParts(digits);
  return parseInt(mm, 10) * 60 + parseInt(ss, 10);
}

// Seed chip edit-state from the entry being opened so reopening a saved cardio
// (or returning from Summary) shows its previously entered values rather than
// wiping them on the next save.
function seedChipValues(cardio: CardioDetailContentProps["cardio"]): ChipValues {
  return {
    distance: { selected: !!cardio.distance, value: cardio.distance ?? "" },
    calories: { selected: !!cardio.calories, value: cardio.calories ?? "" },
    intensity: { selected: !!cardio.intensity, value: cardio.intensity ?? "" },
  };
}

export const CardioDetailContent = forwardRef<
  CardioDetailContentRef,
  CardioDetailContentProps
>(({ cardio, onSummary, onAddCardio, onSwapCardio }, ref) => {
  const {
    seconds,
    cardioSeconds,
    cardioRunning,
    startCardio,
    pauseCardio,
    resetCardio,
    addCardioEntry,
  } = useWorkoutTimer();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const glassAvailable = isLiquidGlassAvailable();

  const [chipValues, setChipValues] = useState<ChipValues>(() =>
    seedChipValues(cardio),
  );
  const [note, setNote] = useState(cardio.note ?? "");
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  // Tapping the top-bar stopwatch flips to the whole-session timer (mirrors
  // ExerciseDetailContent).
  const [showingTotal, setShowingTotal] = useState(false);
  // Manually typed duration override, held as up-to-4 MM:SS digits ("1530" ->
  // 15:30). When non-empty it overrides the live stopwatch for what gets logged.
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationDigits, setDurationDigits] = useState("");
  // Idle duration baseline — the stored entry duration shown when the stopwatch
  // is at zero. Reset zeroes this so the display returns to 00:00 and stays.
  const [baselineSeconds, setBaselineSeconds] = useState(
    cardio.durationSeconds ?? 0,
  );

  const colors: ThemeColors = isDark
    ? {
        bg: "#0a0a0a",
        surface: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        border: "rgba(255,255,255,0.08)",
        chipBg: "rgba(255,255,255,0.08)",
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
        accent: "#000",
        accentText: "#fff",
        stepperBg: "#fff",
        stepperBorder: "rgba(0,0,0,0.1)",
      };

  // The global cardio stopwatch is the source of truth for the in-progress
  // entry. When reopening a saved entry without touching the stopwatch
  // (cardioSeconds === 0, not running), fall back to its stored duration so an
  // edit of distance/calories/etc. doesn't wipe the recorded time.
  const isRunning = cardioRunning;
  const stopwatchActive = cardioRunning || cardioSeconds > 0;
  const liveCardioSeconds = stopwatchActive ? cardioSeconds : baselineSeconds;

  // A manually entered duration overrides the live stopwatch for what gets
  // logged; the stopwatch keeps running underneath and the top bar still
  // reflects it.
  const manualSeconds =
    durationDigits !== "" ? digitsToSeconds(durationDigits) : null;
  const effectiveDurationSeconds = manualSeconds ?? liveCardioSeconds;
  const hasStarted = isRunning || effectiveDurationSeconds > 0;

  // Top-bar timer: the cardio stopwatch, or the whole workout session when
  // toggled.
  const timerValue = showingTotal ? seconds : liveCardioSeconds;

  const buildEntry = (): CardioEntry => ({
    workoutCardioId: cardio.workoutCardioId,
    cardioActivityId: cardio.cardioActivityId,
    activityType: cardio.activityType,
    durationSeconds: effectiveDurationSeconds,
    distance: chipValues.distance.selected
      ? chipValues.distance.value.trim() || undefined
      : undefined,
    calories: chipValues.calories.selected
      ? chipValues.calories.value.trim() || undefined
      : undefined,
    intensity: chipValues.intensity.selected
      ? chipValues.intensity.value.trim() || undefined
      : undefined,
    note: note.trim() || undefined,
  });

  const saveCardio = () => {
    addCardioEntry(buildEntry());
  };

  useImperativeHandle(ref, () => ({ save: saveCardio }));

  useEffect(() => {
    const listener = Keyboard.addListener("keyboardDidHide", () => {
      setEditingDuration(false);
      saveCardio();
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chipValues, note, durationDigits, effectiveDurationSeconds]);

  // Auto-revert the top-bar timer back from TOTAL after a few seconds.
  useEffect(() => {
    if (!showingTotal) return;
    const id = setTimeout(() => setShowingTotal(false), 5000);
    return () => clearTimeout(id);
  }, [showingTotal]);

  const handleSave = (callback: () => void) => {
    saveCardio();
    callback();
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Timer",
      "Are you sure you want to reset your timer and clear all fields?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: doReset },
      ],
    );
  };

  const doReset = () => {
    // Zero the cardio-scoped stopwatch entirely (cardioSeconds/cardioRunning/
    // cardioStartTimestamp/cardioTotalElapsedSeconds), drop the idle baseline to
    // 0 so the display reads 00:00 and stays there, and clear all fields + any
    // manually typed duration.
    resetCardio();
    setBaselineSeconds(0);
    setDurationDigits("");
    setEditingDuration(false);
    setChipValues({
      distance: { selected: false, value: "" },
      calories: { selected: false, value: "" },
      intensity: { selected: false, value: "" },
    });
  };

  const beginEditDuration = () => {
    // Seed the editable field from the currently displayed duration so the user
    // edits from the live value rather than a blank field.
    const total = effectiveDurationSeconds;
    const seeded = `${String(Math.floor(total / 60)).padStart(2, "0")}${String(
      total % 60,
    ).padStart(2, "0")}`;
    setDurationDigits(seeded === "0000" ? "" : seeded);
    setEditingDuration(true);
  };

  const handleClose = () => {
    const parent = navigation.getParent();
    if (parent) parent.goBack();
    else navigation.goBack();
  };

  const toggleChip = (key: ChipKey) => {
    setChipValues({
      ...chipValues,
      [key]: { ...chipValues[key], selected: !chipValues[key].selected },
    });
  };

  const setFieldValue = (key: ChipKey, value: string) => {
    setChipValues({
      ...chipValues,
      [key]: { ...chipValues[key], value },
    });
  };

  const openNoteModal = () => {
    setNoteDraft(note);
    setNoteModalVisible(true);
  };

  const saveNote = () => {
    setNote(noteDraft);
    setNoteModalVisible(false);
  };

  const showIntensityInfo = () => {
    Alert.alert("Intensity", INTENSITY_TOOLTIP);
  };

  const topBarButtonStyle = [
    styles.topBarButton,
    {
      backgroundColor: glassAvailable ? "transparent" : colors.chipBg,
      borderColor: glassAvailable ? "transparent" : colors.border,
      borderWidth: glassAvailable ? 0 : StyleSheet.hairlineWidth,
    },
  ];

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.bg, paddingTop: insets.top },
          ]}
        >
          <FloatingCloseButton onPress={handleClose} />
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
                <Text style={[styles.timerCaption, { color: colors.textMuted }]}>
                  TOTAL
                </Text>
              )}
            </TouchableOpacity>
            <View style={styles.topBarActions}>
              <TouchableOpacity
                onPress={openNoteModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={topBarButtonStyle}
              >
                {glassAvailable && (
                  <GlassView
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
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
              {/* graph icon — disabled for cardio (no CardioHistory screen yet) */}
              <View style={topBarButtonStyle}>
                {glassAvailable && (
                  <GlassView
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
                    glassEffectStyle="regular"
                    isInteractive
                  />
                )}
                <SymbolView
                  name="chart.xyaxis.line"
                  tintColor={colors.textFaint}
                  size={20}
                />
              </View>
            </View>
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
                CARDIO
              </Text>
              <TouchableOpacity
                onPress={onSwapCardio}
                activeOpacity={0.6}
                disabled={!onSwapCardio}
                style={styles.titleRow}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text
                  style={[styles.title, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {cardio.activityType}
                </Text>
                {onSwapCardio && (
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
              {/* Duration */}
              <View style={heroStyles.row}>
                <Text style={[heroStyles.label, { color: colors.textMuted }]}>
                  Duration
                </Text>
                <View style={cardioStyles.durationValueRow}>
                  {editingDuration ? (
                    <TextInput
                      value={digitsToDisplay(durationDigits)}
                      onChangeText={(text) =>
                        setDurationDigits(text.replace(/\D/g, "").slice(-4))
                      }
                      onBlur={() => setEditingDuration(false)}
                      keyboardType="number-pad"
                      autoFocus
                      style={[
                        heroStyles.input,
                        cardioStyles.durationDisplay,
                        { color: colors.text },
                      ]}
                    />
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={beginEditDuration}
                      style={cardioStyles.durationDisplay}
                    >
                      <Text
                        style={[
                          heroStyles.input,
                          {
                            color: hasStarted ? colors.text : colors.textFaint,
                          },
                        ]}
                      >
                        {formatTime(effectiveDurationSeconds)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={isRunning ? pauseCardio : startCardio}
                    style={[
                      cardioStyles.playButton,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <SymbolView
                      name={isRunning ? "pause.fill" : "play.fill"}
                      tintColor={colors.accentText}
                      size={22}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={[styles.heroDivider, { backgroundColor: colors.border }]}
              />

              {/* Optional field chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={cardioStyles.chipRow}
              >
                {CHIP_CONFIG.map(({ key, label }) => {
                  const selected = chipValues[key].selected;
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.7}
                      onPress={() => toggleChip(key)}
                      style={[
                        cardioStyles.chip,
                        {
                          backgroundColor: selected
                            ? colors.accent
                            : colors.stepperBg,
                          borderColor: selected
                            ? colors.accent
                            : colors.stepperBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          cardioStyles.chipText,
                          { color: selected ? colors.accentText : colors.text },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Expanded fields — only for selected chips, in fixed order */}
              {CHIP_CONFIG.map(({ key, label, unit }) => {
                if (!chipValues[key].selected) return null;
                const isIntensity = key === "intensity";
                return (
                  <View key={key}>
                    <View
                      style={[
                        styles.heroDivider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <View style={heroStyles.row}>
                      <View style={cardioStyles.fieldLabelRow}>
                        <Text
                          style={[
                            heroStyles.label,
                            { color: colors.textMuted, marginBottom: 0 },
                          ]}
                        >
                          {label}
                        </Text>
                        {isIntensity && (
                          <TouchableOpacity
                            onPress={showIntensityInfo}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <SymbolView
                              name="info.circle"
                              tintColor={colors.textFaint}
                              size={16}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={heroStyles.valueRow}>
                        <TextInput
                          value={chipValues[key].value}
                          onChangeText={(v) => setFieldValue(key, v)}
                          keyboardType={
                            key === "calories" ? "number-pad" : "decimal-pad"
                          }
                          placeholder="0"
                          placeholderTextColor={colors.textFaint}
                          maxLength={7}
                          selectTextOnFocus
                          style={[heroStyles.input, { color: colors.text }]}
                        />
                        {unit && (
                          <Text
                            style={[heroStyles.unit, { color: colors.textFaint }]}
                          >
                            {unit}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleReset}
              style={[styles.resetButton, { backgroundColor: colors.accent }]}
            >
              <SymbolView
                name="arrow.counterclockwise"
                tintColor={colors.accentText}
                size={18}
              />
              <Text
                style={[styles.resetButtonText, { color: colors.accentText }]}
              >
                Reset
              </Text>
            </TouchableOpacity>

            {isRunning ? (
              <View style={cardioStyles.hintRow}>
                <View
                  style={[
                    cardioStyles.recordingDot,
                    { backgroundColor: colors.text },
                  ]}
                />
                <Text style={[cardioStyles.hintText, { color: colors.textMuted }]}>
                  Recording session
                </Text>
              </View>
            ) : (
              <View style={cardioStyles.hintRow}>
                <Image
                  source={stopwatch}
                  style={[cardioStyles.hintIcon, { tintColor: colors.textFaint }]}
                />
                <Text style={[cardioStyles.hintText, { color: colors.textFaint }]}>
                  Tap to start timing your session
                </Text>
              </View>
            )}
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
              <Text style={[styles.footerSecondaryText, { color: colors.text }]}>
                Summary
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerPrimary, { backgroundColor: colors.accent }]}
              onPress={() => handleSave(onAddCardio)}
            >
              <Text
                style={[styles.footerPrimaryText, { color: colors.accentText }]}
              >
                Log Cardio →
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
                  placeholder="Add a note for this cardio entry"
                  placeholderTextColor={colors.textFaint}
                  multiline
                  autoFocus
                  style={[
                    styles.modalInput,
                    { color: colors.text, backgroundColor: colors.chipBg },
                  ]}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setNoteModalVisible(false)}
                    style={styles.modalSecondary}
                  >
                    <Text
                      style={[styles.modalSecondaryText, { color: colors.text }]}
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

// ---- Styles copied from ExerciseDetailContent (source of truth) ----
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

  topBarActions: {
    position: "absolute",
    right: 16,
    top: 8,
    flexDirection: "row",
    gap: 8,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  title: {
    flexShrink: 1,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 36,
  },

  titleSwapIcon: {
    width: 22,
    height: 22,
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

  resetButton: {
    marginHorizontal: 20,
    marginBottom: 18,
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  resetButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 8,
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
});

// Hero input metrics — copied verbatim from ExerciseDetailContent's heroStyles
// so the Duration timer and expanded fields render at the exact Reps/Weight
// scale.
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
    fontSize: 26,
    fontWeight: "500",
    marginLeft: 8,
  },
});

// Cardio-only elements that have no direct equivalent in ExerciseDetailContent.
// Values derive from the existing plate-button / segmented tokens.
const cardioStyles = StyleSheet.create({
  durationValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationDisplay: {
    flex: 1,
  },
  playButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  hintIcon: { width: 16, height: 16 },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  hintText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
