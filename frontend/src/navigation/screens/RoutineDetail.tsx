import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { Text } from "../../components/Text";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { getRoutineDetail, deleteRoutine } from "../../api/routineService";
import { Routine, RoutineExercise } from "../../api/types";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { formatDay } from "../../utils/days";
import { useThemeColors } from "../../hooks/useThemeColors";
import { formatPrimaryBodyParts } from "../../utils/exerciseUtils";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { Spinner } from "../../components/Spinner";

/**
 * A display unit in the exercise card: either one ungrouped exercise or a
 * run of CONSECUTIVE exercises sharing a non-null supersetGroup. Runs of one
 * (degraded data) render ungrouped, mirroring the server adjacency rule.
 */
type RoutineDisplayBlock = {
  key: string;
  exercises: RoutineExercise[];
  grouped: boolean;
};

function buildSupersetBlocks(
  exercises: RoutineExercise[],
): RoutineDisplayBlock[] {
  const blocks: RoutineDisplayBlock[] = [];
  let i = 0;
  while (i < exercises.length) {
    const g = exercises[i].supersetGroup;
    if (g == null) {
      blocks.push({
        key: exercises[i].routineExerciseId,
        exercises: [exercises[i]],
        grouped: false,
      });
      i++;
      continue;
    }
    let j = i;
    while (j < exercises.length && exercises[j].supersetGroup === g) j++;
    if (j - i >= 2) {
      blocks.push({
        key: `sg-${g}-${exercises[i].routineExerciseId}`,
        exercises: exercises.slice(i, j),
        grouped: true,
      });
    } else {
      blocks.push({
        key: exercises[i].routineExerciseId,
        exercises: [exercises[i]],
        grouped: false,
      });
    }
    i = j;
  }
  return blocks;
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

function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

function RoutineDetailSkeleton({
  topPadding,
  cardBg,
  cardBorder,
  separator,
  skeleton,
}: {
  topPadding: number;
  cardBg: string;
  cardBorder: string;
  separator: string;
  skeleton: string;
}) {
  const opacity = useSkeletonPulse();
  return (
    <View style={[styles.scrollContent, { paddingTop: topPadding }]}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <Animated.View
          style={{
            flex: 1,
            height: 32,
            borderRadius: 8,
            backgroundColor: skeleton,
            opacity,
          }}
        />
        <Animated.View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: skeleton,
            opacity,
          }}
        />
      </View>

      {/* Day pills */}
      <View style={[styles.daysRow, { marginTop: 12 }]}>
        {[60, 70, 55].map((w, i) => (
          <Animated.View
            key={i}
            style={{
              width: w,
              height: 26,
              borderRadius: 20,
              backgroundColor: skeleton,
              opacity,
            }}
          />
        ))}
      </View>

      {/* Exercise count line */}
      <Animated.View
        style={{
          width: 100,
          height: 12,
          borderRadius: 3,
          backgroundColor: skeleton,
          opacity,
          marginBottom: 16,
        }}
      />

      {/* Exercise list card */}
      <View
        style={[
          styles.exerciseCard,
          { backgroundColor: cardBg, borderColor: cardBorder },
        ]}
      >
        {[0, 1, 2, 3].map((i) => (
          <View key={i}>
            <View style={styles.exerciseRow}>
              <Animated.View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: skeleton,
                  opacity,
                  marginRight: 14,
                }}
              />
              <View style={styles.exerciseInfo}>
                <Animated.View
                  style={{
                    width: "70%",
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: skeleton,
                    opacity,
                  }}
                />
                <Animated.View
                  style={{
                    width: "40%",
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: skeleton,
                    opacity,
                    marginTop: 6,
                  }}
                />
              </View>
            </View>
            {i < 3 && (
              <View
                style={[styles.separator, { backgroundColor: separator }]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export function RoutineDetail({
  route,
}: {
  route: { params: { routineId: string } };
}) {
  const { routineId } = route.params;
  const { loadFromRoutine, hasActiveWorkout } = useWorkoutTimer();
  const navigation = useNavigation<any>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadRoutine = async () => {
        try {
          const data = await getRoutineDetail(routineId);
          setRoutine(data);
        } catch (err: any) {
          setError(err.message ?? "Failed to load routine");
        } finally {
          setLoading(false);
        }
      };
      loadRoutine();
    }, [routineId]),
  );

  const startRoutineWorkout = async () => {
    if (!routine || routine.exercises.length === 0) {
      Alert.alert(
        "No exercises",
        "This routine has no exercises to start a workout with.",
      );
      return;
    }
    setStarting(true);
    try {
      await loadFromRoutine(
        routine.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.exerciseName,
          bodyParts: ex.bodyParts,
          supersetGroup: ex.supersetGroup,
        })),
      );
      (navigation as any).navigate("WorkoutFlow", {
        screen: "WorkoutSummary",
      });
    } finally {
      setStarting(false);
    }
  };

  const handleStartWorkout = () => {
    if (starting || deleting) return;

    if (!routine || routine.exercises.length === 0) {
      Alert.alert(
        "No exercises",
        "This routine has no exercises to start a workout with.",
      );
      return;
    }

    if (hasActiveWorkout) {
      Alert.alert(
        "Workout in progress",
        "You have a workout in progress. Discard it and start this routine?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard & Start",
            style: "destructive",
            onPress: () => startRoutineWorkout(),
          },
        ],
      );
      return;
    }

    startRoutineWorkout();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Routine",
      `Are you sure you want to delete "${routine?.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteRoutine(routineId);
              navigation.goBack();
            } catch {
              Alert.alert(
                "Error",
                "Failed to delete routine. Please try again.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.appBg }]}>
        <FloatingCloseButton direction="left" accessibilityLabel="Back" />
        <RoutineDetailSkeleton
          topPadding={insets.top + 60}
          cardBg={colors.cardBg}
          cardBorder={colors.cardBorder}
          separator={colors.separator}
          skeleton={colors.skeleton}
        />
      </View>
    );
  }

  if (error || !routine) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.appBg },
        ]}
      >
        <FloatingCloseButton direction="left" accessibilityLabel="Back" />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error ?? "Routine not found"}
        </Text>
      </View>
    );
  }

  const blocks = buildSupersetBlocks(routine.exercises);

  const renderExerciseRow = (ex: RoutineExercise) => (
    <View style={styles.exerciseRow}>
      <View
        style={[styles.positionBadge, { backgroundColor: colors.positionBg }]}
      >
        <Text style={[styles.positionText, { color: colors.secondary }]}>
          {ex.position}
        </Text>
      </View>
      <View style={styles.exerciseInfo}>
        <Text style={[styles.exerciseName, { color: colors.text }]}>
          {ex.exerciseName}
        </Text>
        <Text style={[styles.exerciseBodyPart, { color: colors.secondary }]}>
          {formatPrimaryBodyParts(ex.bodyParts)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Routine name */}
        <View style={styles.titleRow}>
          <Text style={[styles.routineName, { color: colors.text }]}>
            {routine.name}
          </Text>
          <TouchableOpacity
            accessibilityLabel="Edit"
            activeOpacity={0.7}
            style={[
              styles.editButton,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={() =>
              routine &&
              (navigation as any).navigate("EditRoutine", { routine })
            }
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 20h4l10-10-4-4L4 16v4z"
                stroke={colors.text}
                strokeWidth={1.6}
                strokeLinejoin="round"
                fill="none"
              />
              <Path
                d="M13.5 6.5l4 4"
                stroke={colors.text}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Scheduled day pills */}
        {routine.scheduledDays.length > 0 && (
          <View style={styles.daysRow}>
            {routine.scheduledDays.map((day) => (
              <View
                key={day}
                style={[styles.dayPill, { backgroundColor: colors.separator }]}
              >
                <Text style={[styles.dayPillText, { color: colors.pillText }]}>
                  {formatDay(day)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Exercise count */}
        <Text style={[styles.exerciseCount, { color: colors.secondary }]}>
          {routine.exercises.length}{" "}
          {routine.exercises.length === 1 ? "exercise" : "exercises"}
        </Text>

        {/* Exercise list card */}
        <View
          style={[
            styles.exerciseCard,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          {routine.exercises.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondary }]}>
              No exercises in this routine yet.
            </Text>
          ) : (
            blocks.map((block, bi) =>
              block.grouped ? (
                <View
                  key={block.key}
                  style={[
                    styles.supersetContainer,
                    {
                      borderColor: colors.cardBorder,
                      backgroundColor: colors.cardBg,
                    },
                  ]}
                >
                  <View style={styles.supersetHeader}>
                    <LinkGlyph color={colors.secondary} />
                    <Text
                      style={[styles.supersetLabel, { color: colors.secondary }]}
                    >
                      SUPERSET
                    </Text>
                  </View>
                  {block.exercises.map((ex, j) => (
                    <View key={ex.routineExerciseId}>
                      {renderExerciseRow(ex)}
                      {j < block.exercises.length - 1 && (
                        <View
                          style={[
                            styles.separator,
                            { backgroundColor: colors.separator },
                          ]}
                        />
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View key={block.key}>
                  {renderExerciseRow(block.exercises[0])}
                  {bi < blocks.length - 1 && !blocks[bi + 1].grouped && (
                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: colors.separator },
                      ]}
                    />
                  )}
                </View>
              ),
            )
          )}
        </View>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={[styles.deleteText, { color: colors.danger }]}>
            {deleting ? "Deleting..." : "Delete Routine"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Start Workout button */}
      <View
        style={[
          styles.stickyBottom,
          {
            backgroundColor: colors.appBg,
            borderTopColor: colors.separator,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.startButton,
            { borderColor: colors.text },
            starting && styles.disabledButton,
          ]}
          onPress={handleStartWorkout}
          disabled={starting}
          activeOpacity={0.7}
        >
          {starting ? (
            <Spinner color={colors.text} />
          ) : (
            <Text style={[styles.startButtonText, { color: colors.text }]}>
              Start Workout
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  routineName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dayPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  exerciseCount: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  exerciseCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  positionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  exerciseBodyPart: {
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  supersetContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 12,
    marginVertical: 8,
  },
  supersetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  supersetLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  emptyText: {
    textAlign: "center",
    padding: 24,
    fontSize: 15,
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    padding: 20,
  },
  stickyBottom: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  startButton: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
