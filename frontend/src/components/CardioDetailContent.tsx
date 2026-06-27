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
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { ScrollView } from "react-native-gesture-handler";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import stopwatch from "../assets/stopwatch.png";
import { useWorkoutTimer, CardioEntry } from "../context/WorkoutContext";
import { FloatingCloseButton } from "./FloatingCloseButton";
import { FloatingKeyboardDismiss } from "./FloatingKeyboardDismiss";

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
};

const INTENSITY_TOOLTIP =
  "A single number for how hard the effort was — use whatever your machine shows: treadmill incline %, bike resistance level, elliptical ramp, etc. Leave blank if not applicable.";

export const CardioDetailContent = forwardRef<
  CardioDetailContentRef,
  CardioDetailContentProps
>(({ cardio, onSummary, onAddCardio }, ref) => {
  const {
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

  const [distance, setDistance] = useState(cardio.distance ?? "");
  const [calories, setCalories] = useState(cardio.calories ?? "");
  const [intensity, setIntensity] = useState(cardio.intensity ?? "");
  const [note, setNote] = useState(cardio.note ?? "");
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

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
      };

  const formatTime = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0",
    )}`;

  // The global cardio stopwatch is the source of truth for the in-progress
  // entry. When reopening a saved entry without touching the stopwatch
  // (cardioSeconds === 0, not running), fall back to its stored duration so an
  // edit of distance/calories/etc. doesn't wipe the recorded time.
  const stopwatchActive = cardioRunning || cardioSeconds > 0;
  const durationSeconds = stopwatchActive
    ? cardioSeconds
    : (cardio.durationSeconds ?? 0);

  const buildEntry = (): CardioEntry => ({
    workoutCardioId: cardio.workoutCardioId,
    cardioActivityId: cardio.cardioActivityId,
    activityType: cardio.activityType,
    durationSeconds,
    distance: distance.trim() || undefined,
    calories: calories.trim() || undefined,
    intensity: intensity.trim() || undefined,
    note: note.trim() || undefined,
  });

  const saveCardio = () => {
    addCardioEntry(buildEntry());
  };

  useImperativeHandle(ref, () => ({ save: saveCardio }));

  useEffect(() => {
    const listener = Keyboard.addListener("keyboardDidHide", () => {
      saveCardio();
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distance, calories, intensity, note, durationSeconds]);

  const handleSave = (callback: () => void) => {
    saveCardio();
    callback();
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
            <View style={styles.timerTap}>
              <Image
                source={stopwatch}
                style={[styles.timerIcon, { tintColor: colors.text }]}
              />
              <Text style={[styles.timerText, { color: colors.text }]}>
                {formatTime(durationSeconds)}
              </Text>
            </View>
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
                CARDIO
              </Text>
              <Text
                style={[styles.title, { color: colors.text }]}
                numberOfLines={2}
              >
                {cardio.activityType}
              </Text>
            </View>

            <View
              style={[
                styles.timerCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <Text style={[styles.bigTimer, { color: colors.text }]}>
                {formatTime(durationSeconds)}
              </Text>
              <View style={styles.timerControls}>
                <TouchableOpacity
                  onPress={cardioRunning ? pauseCardio : startCardio}
                  style={[
                    styles.primaryControl,
                    { backgroundColor: colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryControlText,
                      { color: colors.accentText },
                    ]}
                  >
                    {cardioRunning ? "Pause" : "Start"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    pauseCardio();
                    resetCardio();
                  }}
                  style={[
                    styles.secondaryControl,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryControlText,
                      { color: colors.text },
                    ]}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldsSection}>
              <CardioField
                label="Distance"
                unit="mi"
                value={distance}
                onChangeText={setDistance}
                colors={colors}
              />
              <CardioField
                label="Calories"
                value={calories}
                onChangeText={setCalories}
                colors={colors}
                integer
              />
              <CardioField
                label="Intensity"
                value={intensity}
                onChangeText={setIntensity}
                colors={colors}
                onInfoPress={showIntensityInfo}
              />
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
              onPress={() => handleSave(onAddCardio)}
            >
              <Text
                style={[styles.footerPrimaryText, { color: colors.accentText }]}
              >
                Add another →
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

function CardioField({
  label,
  unit,
  value,
  onChangeText,
  colors,
  integer,
  onInfoPress,
}: {
  label: string;
  unit?: string;
  value: string;
  onChangeText: (v: string) => void;
  colors: ThemeColors;
  integer?: boolean;
  onInfoPress?: () => void;
}) {
  return (
    <View style={[fieldStyles.row, { borderBottomColor: colors.border }]}>
      <View style={fieldStyles.labelRow}>
        <Text style={[fieldStyles.label, { color: colors.textMuted }]}>
          {label}
        </Text>
        {onInfoPress && (
          <TouchableOpacity
            onPress={onInfoPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SymbolView
              name="info.circle"
              tintColor={colors.textFaint}
              size={16}
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={fieldStyles.valueRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={integer ? "number-pad" : "decimal-pad"}
          placeholder="0"
          placeholderTextColor={colors.textFaint}
          maxLength={7}
          style={[fieldStyles.input, { color: colors.text }]}
          selectTextOnFocus
        />
        {unit && (
          <Text style={[fieldStyles.unit, { color: colors.textFaint }]}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8, paddingBottom: 0 },
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
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
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
  timerCard: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  bigTimer: {
    fontSize: 64,
    fontWeight: "700",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
    marginBottom: 18,
  },
  timerControls: { flexDirection: "row", gap: 10, width: "100%" },
  primaryControl: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryControlText: { fontSize: 16, fontWeight: "600" },
  secondaryControl: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryControlText: { fontSize: 16, fontWeight: "600" },
  fieldsSection: { paddingHorizontal: 20 },
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
  footerPrimaryText: { fontSize: 15, fontWeight: "600", letterSpacing: -0.2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: { width: "100%", borderRadius: 20, padding: 20 },
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
  modalSecondaryText: { fontSize: 15, fontWeight: "500" },
  modalPrimary: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: { fontSize: 15, fontWeight: "600" },
});

const fieldStyles = StyleSheet.create({
  row: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 13, fontWeight: "500", marginBottom: 4 },
  valueRow: { flexDirection: "row", alignItems: "baseline" },
  input: {
    flex: 1,
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1,
    padding: 0,
    margin: 0,
    fontVariant: ["tabular-nums"],
  },
  unit: { fontSize: 20, fontWeight: "500", marginLeft: 8 },
});
