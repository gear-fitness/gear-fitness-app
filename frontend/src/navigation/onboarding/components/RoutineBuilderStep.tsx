import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
} from "react-native";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { FloatingKeyboardDismiss } from "../../../components/FloatingKeyboardDismiss";
import { recommendRoutines } from "../routineTemplates";
import { EXERCISE_LIBRARY } from "../exerciseLibrary";
import { DraftRoutine, DraftRoutineExercise, TrainingDay } from "../types";
import { TRAINING_DAY_OPTIONS } from "../intakeOptions";

const DAY_LETTERS: Record<TrainingDay, string> = {
  MON: "M",
  TUE: "T",
  WED: "W",
  THU: "T",
  FRI: "F",
  SAT: "S",
  SUN: "S",
};

export function RoutineBuilderStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const routines = useMemo<DraftRoutine[]>(
    () =>
      draft.routines ??
      recommendRoutines({
        daysPerWeek: draft.daysPerWeek,
        trainingDays: draft.trainingDays,
        equipment: draft.equipment,
      }),
    [draft.routines, draft.daysPerWeek, draft.trainingDays, draft.equipment],
  );

  // Make sure the seeded recommendation is persisted into the draft.
  useEffect(() => {
    if (!draft.routines) updateDraft({ routines: routines });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pickerFor, setPickerFor] = useState<number | null>(null);

  const setRoutines = (next: DraftRoutine[]) => updateDraft({ routines: next });

  const updateRoutine = (idx: number, partial: Partial<DraftRoutine>) =>
    setRoutines(routines.map((r, i) => (i === idx ? { ...r, ...partial } : r)));

  const toggleDay = (idx: number, day: TrainingDay) => {
    const r = routines[idx];
    const days = r.scheduledDays.includes(day)
      ? r.scheduledDays.filter((d) => d !== day)
      : [...r.scheduledDays, day];
    updateRoutine(idx, { scheduledDays: days });
  };

  const removeExercise = (rIdx: number, eIdx: number) =>
    updateRoutine(rIdx, {
      exercises: routines[rIdx].exercises.filter((_, i) => i !== eIdx),
    });

  const addExercise = (rIdx: number, ex: DraftRoutineExercise) => {
    if (routines[rIdx].exercises.some((e) => e.name === ex.name)) return;
    updateRoutine(rIdx, { exercises: [...routines[rIdx].exercises, ex] });
  };

  const removeRoutine = (idx: number) =>
    setRoutines(routines.filter((_, i) => i !== idx));

  const addRoutine = () =>
    setRoutines([
      ...routines,
      {
        name: `Routine ${routines.length + 1}`,
        scheduledDays: [],
        exercises: [],
      },
    ]);

  const canContinue = routines.some((r) => r.exercises.length > 0);

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <ScrollView
        style={shared.body}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={shared.heading}>Build your routines</Text>
        <Text style={shared.subheading}>
          Rename them, set the days, and add the lifts you want.
        </Text>

        {routines.map((routine, rIdx) => (
          <View
            key={rIdx}
            style={[
              styles.card,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardHeader}>
              <TextInput
                value={routine.name}
                onChangeText={(t) => updateRoutine(rIdx, { name: t })}
                placeholder="Routine name"
                placeholderTextColor={colors.handle}
                style={[styles.nameInput, { color: colors.text }]}
              />
              {routines.length > 1 && (
                <Pressable
                  onPress={() => removeRoutine(rIdx)}
                  hitSlop={8}
                  style={styles.removeRoutine}
                >
                  <Text
                    style={[
                      styles.removeRoutineText,
                      { color: colors.secondary },
                    ]}
                  >
                    Remove
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.dayRow}>
              {TRAINING_DAY_OPTIONS.map((d) => {
                const active = routine.scheduledDays.includes(d.value);
                return (
                  <Pressable
                    key={d.value}
                    onPress={() => toggleDay(rIdx, d.value)}
                    style={[
                      styles.dayDot,
                      { borderColor: colors.border },
                      active && {
                        backgroundColor: colors.accent,
                        borderColor: colors.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayDotText,
                        {
                          color: active ? colors.accentText : colors.secondary,
                        },
                      ]}
                    >
                      {DAY_LETTERS[d.value]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {routine.exercises.map((ex, eIdx) => (
              <View key={eIdx} style={styles.exRow}>
                <View
                  style={[styles.exDot, { backgroundColor: colors.accent }]}
                />
                <Text style={[styles.exName, { color: colors.text }]}>
                  {ex.name}
                </Text>
                <Pressable
                  onPress={() => removeExercise(rIdx, eIdx)}
                  hitSlop={8}
                >
                  <Text style={[styles.exRemove, { color: colors.secondary }]}>
                    ✕
                  </Text>
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={() => setPickerFor(rIdx)}
              style={[styles.addExercise, { borderColor: colors.border }]}
            >
              <Text style={[styles.addExerciseText, { color: colors.text }]}>
                + Add exercise
              </Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={addRoutine}
          style={[styles.addRoutine, { borderColor: colors.dashedBorder }]}
        >
          <Text style={[styles.addRoutineText, { color: colors.secondary }]}>
            + Add another routine
          </Text>
        </Pressable>
      </ScrollView>

      <View style={shared.footer}>
        <Pressable
          onPress={onNext}
          disabled={!canContinue}
          style={[
            shared.continueBtn,
            !canContinue && shared.continueBtnDisabled,
          ]}
        >
          <Text style={shared.continueBtnText}>Save routines</Text>
        </Pressable>
      </View>

      <ExercisePickerModal
        visible={pickerFor !== null}
        existing={
          pickerFor !== null
            ? routines[pickerFor].exercises.map((e) => e.name)
            : []
        }
        onClose={() => setPickerFor(null)}
        onPick={(ex) => {
          if (pickerFor !== null) addExercise(pickerFor, ex);
        }}
      />
      <FloatingKeyboardDismiss />
    </View>
  );
}

function ExercisePickerModal({
  visible,
  existing,
  onClose,
  onPick,
}: {
  visible: boolean;
  existing: string[];
  onClose: () => void;
  onPick: (ex: DraftRoutineExercise) => void;
}) {
  const colors = useOnboardingColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
          <View
            style={[styles.modalHandle, { backgroundColor: colors.handle }]}
          />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add an exercise
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[styles.modalDone, { color: colors.text }]}>
                Done
              </Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {EXERCISE_LIBRARY.map((grp) => (
              <View key={grp.group} style={styles.modalGroup}>
                <Text
                  style={[styles.modalGroupTitle, { color: colors.secondary }]}
                >
                  {grp.group.toUpperCase()}
                </Text>
                {grp.exercises.map((ex) => {
                  const added = existing.includes(ex.name);
                  return (
                    <Pressable
                      key={ex.name}
                      onPress={() => !added && onPick(ex)}
                      style={[
                        styles.modalRow,
                        {
                          backgroundColor: colors.cardBg,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.modalExName, { color: colors.text }]}
                      >
                        {ex.name}
                      </Text>
                      <Text
                        style={[
                          styles.modalAdd,
                          { color: added ? colors.secondary : colors.accent },
                        ]}
                      >
                        {added ? "Added" : "+ Add"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameInput: {
    flex: 1,
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.3,
    paddingVertical: 2,
  },
  removeRoutine: {
    paddingLeft: 10,
  },
  removeRoutineText: {
    fontSize: 13,
    fontWeight: "500",
  },
  dayRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    marginBottom: 6,
  },
  dayDot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDotText: {
    fontSize: 13,
    fontWeight: "700",
  },
  exRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    gap: 10,
  },
  exDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  exName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  exRemove: {
    fontSize: 15,
    paddingHorizontal: 4,
  },
  addExercise: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 11,
    alignItems: "center",
  },
  addExerciseText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addRoutine: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 2,
  },
  addRoutineText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    height: "82%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    alignSelf: "center",
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalDone: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalGroup: {
    marginBottom: 18,
  },
  modalGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 8,
  },
  modalExName: {
    fontSize: 15,
    fontWeight: "500",
  },
  modalAdd: {
    fontSize: 14,
    fontWeight: "700",
  },
});
