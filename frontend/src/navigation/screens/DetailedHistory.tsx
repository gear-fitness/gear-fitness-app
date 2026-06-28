import {
  Text,
  StyleSheet,
  View,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  TouchableOpacity,
  StyleProp,
  TextStyle,
  ColorValue,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import React, { useState, useEffect } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getWorkoutDetails } from "../../api/workoutService";
import {
  WorkoutDetail,
  WorkoutExercise,
  WorkoutSet,
  WorkoutCardio,
} from "../../api/types";
import { isNetworkError } from "../../utils/network";
import { parseLocalDate } from "../../utils/date";
import { formatCardioDuration } from "../../utils/cardio";
import { toDisplayDistance } from "../../utils/distance";
import { useTrackTab } from "../../hooks/useTrackTab";
import { formatTag } from "../../utils/formatTag";
import { formatMuscleGroups, renderBodyParts } from "../../utils/exerciseUtils";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Ionicons } from "@expo/vector-icons";
import { useLikeState } from "../../context/LikesContext";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { MusclesPair, type BodyVariant } from "../../components/MuscleDiagram";
import { useAuth } from "../../context/AuthContext";
import { useUnitPreference } from "../../context/UnitPreferenceContext";
import { toDisplayWeight } from "../../utils/weight";
import { usePostMenu } from "../../hooks/usePostMenu";
import { PostVisibilitySheet } from "../../components/PostVisibilitySheet";
import { PostActionsSheet } from "../../components/PostActionsSheet";
import { ReportPostSheet } from "../../components/ReportPostSheet";
import { MentionableText } from "../../components/MentionableText";
import {
  computeActivations,
  defaultDiagramPalette,
  resolveBodyVariant,
} from "../../utils/muscleActivations";

type RootStackParamList = {
  DetailedHistory: {
    workoutId: string;
    caption?: string;
    workoutName?: string;
    postId?: string;
    /** When viewing a post, the post's author id — used to render the
     *  correct gendered body for one's own posts. Absent when navigating
     *  from one's own workout history. */
    ownerUserId?: string;
    /** Author's username — needed for the follow/unfollow flow when the
     *  3-dots menu is tapped on someone else's workout. */
    ownerUsername?: string;
    /** Whether the viewer follows the author, precomputed on the feed payload,
     *  so the menu's Follow/Unfollow label is correct without a fetch. */
    viewerFollowsAuthor?: boolean;
    initialLikeCount?: number;
    initialLikedByUser?: boolean;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, "DetailedHistory">;

const PR_GOLD = "#D4A017";

export function DetailedHistory({ route }: Props) {
  useTrackTab("DetailedHistory");

  const navigation = useNavigation();
  const { colors } = useTheme();

  const isDark = useColorScheme() === "dark";
  const accent = isDark ? "#fff" : "#000";

  const insets = useSafeAreaInsets();
  const {
    workoutId,
    caption,
    postId,
    ownerUserId,
    ownerUsername,
    viewerFollowsAuthor,
    initialLikeCount,
    initialLikedByUser,
  } = route.params;

  const {
    onPress: onMenuPress,
    actions: menuActions,
    showVisibilitySheet,
    closeVisibilitySheet,
    pendingVisibility,
    handleVisibilitySelect,
    showActionsSheet,
    closeActionsSheet,
    onActionsSheetClosed,
    showReportSheet,
    closeReportSheet,
    submitReport,
  } = usePostMenu({
    workoutId,
    postId,
    ownerUserId,
    ownerUsername,
    viewerFollowsAuthor,
  });

  const { user } = useAuth();
  // Treat "this is the viewer's own workout" as: navigated from own history
  // (no ownerUserId) OR the post's author is the current user. Anything else
  // falls back to male — we don't have other users' genders client-side.
  const isOwnWorkout =
    ownerUserId === undefined || ownerUserId === user?.userId;
  const bodyVariant: BodyVariant = isOwnWorkout
    ? resolveBodyVariant(user?.gender)
    : "male";

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const likeFallback =
    postId !== undefined
      ? {
          likedByCurrentUser: initialLikedByUser ?? false,
          likeCount: initialLikeCount ?? 0,
        }
      : undefined;
  const { liked: likedByUser, toggle: handleLike } = useLikeState(
    postId ?? "",
    likeFallback,
  );

  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        const data = await getWorkoutDetails(workoutId);
        setWorkout(data);
        setLoading(false);
      } catch (err: any) {
        console.error("Error loading workout details:", err);
        // Surface a friendlier message when the failure is purely a
        // connectivity problem and there was no cached summary to fall back
        // to. Other errors keep their raw message so we don't hide bugs.
        if (isNetworkError(err)) {
          setError(
            "You're offline and this workout's details aren't cached on this device.",
          );
        } else {
          setError(err.message);
        }
        setLoading(false);
      }
    };

    fetchWorkout();
  }, [workoutId]);

  const textMuted: StyleProp<TextStyle> = { color: colors.text, opacity: 0.5 };
  const textFaint: StyleProp<TextStyle> = { color: colors.text, opacity: 0.4 };

  const glassAvailable = isLiquidGlassAvailable();

  const backButton = <FloatingCloseButton direction="left" />;

  const dotsButton = (
    <TouchableOpacity
      onPress={onMenuPress}
      hitSlop={10}
      accessibilityLabel="More options"
      style={[
        styles.dotsButton,
        {
          top: insets.top + 8,
          backgroundColor: glassAvailable ? "transparent" : colors.background,
          borderColor: glassAvailable ? "transparent" : colors.border,
        },
      ]}
    >
      {glassAvailable && (
        <GlassView
          style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
          glassEffectStyle="regular"
          isInteractive
        />
      )}
      <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
    </TouchableOpacity>
  );

  const floatingActions = postId ? (
    <View style={[styles.floatingActions, { bottom: insets.bottom + 16 }]}>
      <TouchableOpacity
        accessibilityLabel={likedByUser ? "Unlike" : "Like"}
        onPress={handleLike}
        activeOpacity={0.7}
        style={[
          styles.floatingButton,
          {
            backgroundColor: glassAvailable ? "transparent" : colors.background,
            borderColor: glassAvailable ? "transparent" : colors.border,
          },
        ]}
      >
        {glassAvailable && (
          <GlassView
            style={[StyleSheet.absoluteFillObject, { borderRadius: 23 }]}
            glassEffectStyle="regular"
            isInteractive
          />
        )}
        <Ionicons
          name={likedByUser ? "heart" : "heart-outline"}
          size={22}
          color={likedByUser ? "#e74c3c" : colors.text}
        />
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityLabel="Comments"
        onPress={() =>
          navigation.navigate("Comments", { postId, postOwnerId: ownerUserId })
        }
        activeOpacity={0.7}
        style={[
          styles.floatingButton,
          {
            backgroundColor: glassAvailable ? "transparent" : colors.background,
            borderColor: glassAvailable ? "transparent" : colors.border,
          },
        ]}
      >
        {glassAvailable && (
          <GlassView
            style={[StyleSheet.absoluteFillObject, { borderRadius: 23 }]}
            glassEffectStyle="regular"
            isInteractive
          />
        )}
        <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
      </TouchableOpacity>
    </View>
  ) : null;

  const bodyPaddingTop = insets.top + 68;

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        {backButton}
        {dotsButton}
        {floatingActions}
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading workout...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        {backButton}
        {dotsButton}
        {floatingActions}
        <Text style={[styles.errorText, { color: colors.text }]}>
          Error: {error}
        </Text>
        <Text style={[styles.errorSubtext, textMuted]}>
          Workout ID: {workoutId}
        </Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        {backButton}
        {dotsButton}
        {floatingActions}
        <Text style={[styles.errorText, { color: colors.text }]}>
          Workout not found
        </Text>
      </View>
    );
  }

  const dateOverline = parseLocalDate(workout.datePerformed)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();

  const hasDuration = workout.durationMin != null && workout.durationMin > 0;
  const hasCardio = !!workout.cardio && workout.cardio.length > 0;
  const hasExercises = workout.exercises && workout.exercises.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {backButton}
      {dotsButton}
      {floatingActions}
      <PostActionsSheet
        visible={showActionsSheet}
        actions={menuActions}
        onClose={closeActionsSheet}
        onClosed={onActionsSheetClosed}
      />
      <PostVisibilitySheet
        visible={showVisibilitySheet}
        current={pendingVisibility}
        onSelect={handleVisibilitySelect}
        onClose={closeVisibilitySheet}
      />
      <ReportPostSheet
        visible={showReportSheet}
        onSubmit={submitReport}
        onClose={closeReportSheet}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: bodyPaddingTop,
          paddingBottom: 40,
        }}
      >
        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={[styles.dateOverline, textMuted]}>{dateOverline}</Text>
          <Text style={[styles.workoutName, { color: colors.text }]}>
            {workout.name}
          </Text>

          <View style={styles.metricsRow}>
            {hasDuration && (
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, textMuted]}>Time</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {workout.durationMin} min
                </Text>
              </View>
            )}
            {/* Hide the Exercises metric for cardio-only sessions; show a
                Cardio metric instead so the count isn't a bare "0". */}
            {hasExercises && (
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, textMuted]}>Exercises</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {workout.exercises.length}
                </Text>
              </View>
            )}
            {hasCardio && (
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, textMuted]}>Cardio</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {workout.cardio!.length}
                </Text>
              </View>
            )}
            {workout.bodyTags && workout.bodyTags.length > 0 && (
              <View style={[styles.metric, styles.metricWide]}>
                <Text style={[styles.metricLabel, textMuted]}>Muscles</Text>
                <Text style={[styles.musclesText, { color: colors.text }]}>
                  {formatMuscleGroups(workout.bodyTags)}
                </Text>
              </View>
            )}
          </View>

          {caption && (
            <MentionableText
              text={caption}
              style={[styles.caption, { color: colors.text }]}
            />
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("CreateRoutine", {
                prefilledWorkoutId: workoutId,
              })
            }
            style={[
              styles.saveRoutineButton,
              {
                borderColor: isDark
                  ? "rgba(255,255,255,0.22)"
                  : "rgba(0,0,0,0.2)",
              },
            ]}
          >
            <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
              <Path
                d="M8 3v10M3 8h10"
                stroke={colors.text}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={[styles.saveRoutineText, { color: colors.text }]}>
              Save as routine
            </Text>
          </TouchableOpacity>
        </View>

        {/* Exercises. A cardio-only workout omits this section entirely rather
            than showing the "no exercises" empty state. */}
        {hasExercises ? (
          <View style={styles.exercisesList}>
            {workout.exercises.map((exercise, i) => (
              <ExerciseBlock
                key={exercise.workoutExerciseId}
                exercise={exercise}
                index={i + 1}
                total={workout.exercises.length}
                textColor={colors.text}
                surfaceBg={colors.card}
                borderColor={colors.border}
                textMuted={textMuted}
                textFaint={textFaint}
              />
            ))}
          </View>
        ) : !hasCardio ? (
          <View style={styles.centerContent}>
            <Text style={[styles.noExercisesText, textMuted]}>
              No exercises recorded for this workout
            </Text>
          </View>
        ) : null}

        {/* Cardio */}
        {hasCardio && (
          <CardioSection
            cardio={workout.cardio!}
            textColor={colors.text}
            surfaceBg={colors.card}
            borderColor={colors.border}
            textMuted={textMuted}
            textFaint={textFaint}
          />
        )}

        {hasExercises && (
          <MusclesSection
            exercises={workout.exercises}
            isDark={isDark}
            textMuted={textMuted}
            variant={bodyVariant}
          />
        )}
      </ScrollView>
    </View>
  );
}

type MusclesSectionProps = {
  exercises: WorkoutExercise[];
  isDark: boolean;
  textMuted: StyleProp<TextStyle>;
  variant: BodyVariant;
};

function MusclesSection({
  exercises,
  isDark,
  textMuted,
  variant,
}: MusclesSectionProps) {
  const activations = React.useMemo(
    () => computeActivations(exercises),
    [exercises],
  );
  const palette = React.useMemo(() => defaultDiagramPalette(isDark), [isDark]);

  return (
    <View style={styles.musclesSection}>
      <Text style={[styles.musclesOverline, textMuted]}>MUSCLES WORKED</Text>
      <MusclesPair
        activations={activations}
        variant={variant}
        width={150}
        captionStyle={textMuted}
        {...palette}
      />
    </View>
  );
}

type CardioSectionProps = {
  cardio: WorkoutCardio[];
  textColor: ColorValue;
  surfaceBg: ColorValue;
  borderColor: ColorValue;
  textMuted: StyleProp<TextStyle>;
  textFaint: StyleProp<TextStyle>;
};

function CardioSection({
  cardio,
  textColor,
  surfaceBg,
  borderColor,
  textMuted,
  textFaint,
}: CardioSectionProps) {
  return (
    <View style={styles.cardioSection}>
      <Text style={[styles.cardioOverline, textMuted]}>CARDIO</Text>
      <View style={styles.cardioList}>
        {cardio.map((c, i) => (
          <CardioBlock
            key={c.workoutCardioId}
            cardio={c}
            index={i + 1}
            total={cardio.length}
            textColor={textColor}
            surfaceBg={surfaceBg}
            borderColor={borderColor}
            textMuted={textMuted}
            textFaint={textFaint}
          />
        ))}
      </View>
    </View>
  );
}

type CardioBlockProps = {
  cardio: WorkoutCardio;
  index: number;
  total: number;
  textColor: ColorValue;
  surfaceBg: ColorValue;
  borderColor: ColorValue;
  textMuted: StyleProp<TextStyle>;
  textFaint: StyleProp<TextStyle>;
};

function CardioBlock({
  cardio,
  index,
  total,
  textColor,
  surfaceBg,
  borderColor,
  textMuted,
  textFaint,
}: CardioBlockProps) {
  const { distanceUnit } = useUnitPreference();
  // Only surface fields that were actually logged — no empty Distance/Calories/
  // Intensity rows. distanceMeters is canonical meters; convert to the user's
  // distance unit (mi / km) for display.
  const stats: { label: string; value: string; unit?: string }[] = [
    { label: "Duration", value: formatCardioDuration(cardio.durationSeconds) },
  ];
  if (cardio.distanceMeters != null) {
    stats.push({
      label: "Distance",
      value: `${toDisplayDistance(cardio.distanceMeters, distanceUnit)}`,
      unit: distanceUnit,
    });
  }
  if (cardio.caloriesBurned != null) {
    stats.push({
      label: "Calories",
      value: `${cardio.caloriesBurned}`,
      unit: "cal",
    });
  }
  if (cardio.intensityLevel != null) {
    stats.push({ label: "Intensity", value: `${cardio.intensityLevel}` });
  }

  return (
    <View style={styles.exerciseBlock}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseOverline, textMuted]}>
          ACTIVITY {index} / {total}
        </Text>
        <Text style={[styles.exerciseName, { color: textColor }]}>
          {cardio.activityType}
        </Text>
        {cardio.notes && (
          <Text style={[styles.exerciseNote, textMuted]}>{cardio.notes}</Text>
        )}
      </View>

      <View style={styles.setsList}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={[
              styles.setRow,
              {
                backgroundColor: surfaceBg,
                borderColor,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            {/* Mirror the exercise set row: faint label on the left, big
                tabular value centered in the row (the equal-flex spacer on the
                right keeps the value optically centered). */}
            <Text
              style={[styles.cardioStatLabel, textMuted]}
              numberOfLines={1}
            >
              {stat.label}
            </Text>
            <Text style={[styles.setNumber, { color: textColor }]}>
              {stat.value}
              {stat.unit ? (
                <Text style={[styles.setUnit, textFaint]}> {stat.unit}</Text>
              ) : null}
            </Text>
            <View style={styles.cardioStatSide} />
          </View>
        ))}
      </View>
    </View>
  );
}

type ExerciseBlockProps = {
  exercise: WorkoutExercise;
  index: number;
  total: number;
  textColor: ColorValue;
  surfaceBg: ColorValue;
  borderColor: ColorValue;
  textMuted: StyleProp<TextStyle>;
  textFaint: StyleProp<TextStyle>;
};

function ExerciseBlock({
  exercise,
  index,
  total,
  textColor,
  surfaceBg,
  borderColor,
  textMuted,
  textFaint,
}: ExerciseBlockProps) {
  const isDark = useColorScheme() === "dark";
  const accent = isDark ? "#fff" : "#000";
  return (
    <View style={styles.exerciseBlock}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseOverline, textMuted]}>
          EXERCISE {index} / {total} ·
          {renderBodyParts(exercise.bodyParts, "grey", accent)}
        </Text>
        <Text style={[styles.exerciseName, { color: textColor }]}>
          {exercise.exerciseName}
        </Text>
        {exercise.note && (
          <Text style={[styles.exerciseNote, textMuted]}>{exercise.note}</Text>
        )}
      </View>

      {exercise.sets && exercise.sets.length > 0 ? (
        <View style={styles.setsList}>
          {exercise.sets.map((set, i) => (
            <HistorySetRow
              key={set.workoutSetId}
              set={set}
              idx={i}
              textColor={textColor}
              surfaceBg={surfaceBg}
              borderColor={borderColor}
              textFaint={textFaint}
            />
          ))}
        </View>
      ) : (
        <Text style={[styles.noSetsText, textMuted]}>No sets recorded</Text>
      )}
    </View>
  );
}

type HistorySetRowProps = {
  set: WorkoutSet;
  idx: number;
  textColor: ColorValue;
  surfaceBg: ColorValue;
  borderColor: ColorValue;
  textFaint: StyleProp<TextStyle>;
};

function HistorySetRow({
  set,
  idx,
  textColor,
  surfaceBg,
  borderColor,
  textFaint,
}: HistorySetRowProps) {
  const { weightUnit } = useUnitPreference();
  const isPr = set.isPr;
  return (
    <View
      style={[
        styles.setRow,
        {
          backgroundColor: surfaceBg,
          borderColor: isPr ? PR_GOLD : borderColor,
          borderWidth: isPr ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={[styles.setIndex, textFaint]}>{idx + 1}</Text>
      <View style={styles.setMetric}>
        <Text style={[styles.setNumber, { color: textColor }]}>
          {set.reps}
          <Text style={[styles.setUnit, textFaint]}> reps</Text>
        </Text>
      </View>
      <View style={styles.setMetric}>
        <Text style={[styles.setNumber, { color: textColor }]}>
          {toDisplayWeight(set.weightLbs ?? 0, weightUnit)}
          <Text style={[styles.setUnit, textFaint]}> {weightUnit}</Text>
        </Text>
      </View>
      {isPr ? (
        <View style={styles.prBadge}>
          <Text style={styles.prText}>PR</Text>
          <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
            <Path
              d="M4 3h8v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V3zM3 3h10M6 8v3M10 8v3M5 11h6v2H5z"
              stroke={PR_GOLD}
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      ) : (
        <View style={styles.prPlaceholder} />
      )}
    </View>
  );
}

function formatBodyTag(tag: string) {
  return tag
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  floatingActions: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    flexDirection: "column",
    gap: 12,
    alignItems: "center",
  },
  floatingButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dotsButton: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  dateOverline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  workoutName: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 24,
    alignItems: "flex-start",
  },
  metric: {
    flexShrink: 0,
  },
  metricWide: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  musclesText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
    lineHeight: 22,
    marginTop: 4,
  },
  caption: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 18,
  },
  saveRoutineButton: {
    marginTop: 18,
    alignSelf: "flex-start",
    height: 38,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveRoutineText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  exercisesList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 28,
  },
  exerciseBlock: {},
  exerciseHeader: {
    paddingBottom: 12,
  },
  exerciseOverline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  exerciseName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  exerciseNote: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 4,
  },
  setsList: {
    gap: 6,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
  },
  setIndex: {
    width: 24,
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  setMetric: {
    flex: 1,
  },
  setNumber: {
    fontSize: 22,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  setUnit: {
    fontSize: 12,
    fontWeight: "400",
  },
  prBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  prText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: PR_GOLD,
  },
  prPlaceholder: {
    width: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  noExercisesText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  noSetsText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  musclesSection: {
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  musclesOverline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  cardioSection: {
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  cardioOverline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  cardioList: {
    gap: 28,
  },
  cardioStatLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  cardioStatSide: {
    flex: 1,
  },
});
