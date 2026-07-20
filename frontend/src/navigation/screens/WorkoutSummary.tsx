import {
  Alert,
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Text } from "../../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Sortable, { useItemContext } from "react-native-sortables";
import * as Haptics from "expo-haptics";
import type { SortableGridRenderItem } from "react-native-sortables";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import { useWorkoutTimer, WorkoutExercise } from "../../context/WorkoutContext";
import { useUnitPreference } from "../../context/UnitPreferenceContext";
import { toDisplayWeight } from "../../utils/weight";
import { useTrackTab } from "../../hooks/useTrackTab";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { dismissWorkoutFlow } from "../../utils/dismissWorkoutFlow";

const DESTRUCTIVE = "#C93838";
const LIVE = "#22B574";

const SERIF = "LibreCaslonText_400Regular";

type Theme = {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  chipBorder: string;
  badgeBg: string;
  badgeGlyph: string;
};

// Edit-mode wobble: rotation amplitude in degrees and half-cycle duration.
// Cards are near full-width, so the amplitude stays well under the ~2deg the
// home screen uses on small icons.
const WOBBLE_DEG = 0.5;
const WOBBLE_MS = 130;

// Module-scope so the theme object is referentially stable across renders:
// the timer re-renders this screen every ~100ms, and the memoized exercise
// rows below depend on stable props to skip those ticks.
const DARK_THEME: Theme = {
  bg: "#0a0a0a",
  surface: "#141414",
  text: "#fff",
  textMuted: "rgba(255,255,255,0.55)",
  textFaint: "rgba(255,255,255,0.4)",
  border: "rgba(255,255,255,0.08)",
  chipBorder: "rgba(255,255,255,0.22)",
  badgeBg: "#3a3a3c",
  badgeGlyph: "#f2f2f7",
};
const LIGHT_THEME: Theme = {
  bg: "#fafafa",
  surface: "#ffffff",
  text: "#000",
  textMuted: "rgba(0,0,0,0.5)",
  textFaint: "rgba(0,0,0,0.4)",
  border: "rgba(0,0,0,0.08)",
  chipBorder: "rgba(0,0,0,0.18)",
  badgeBg: "#e3e3e8",
  badgeGlyph: "#48484a",
};

export function WorkoutSummary() {
  useTrackTab("WorkoutSummary", { isModal: true });

  const isDark = useColorScheme() === "dark";
  const { weightUnit: globalUnit } = useUnitPreference();
  const ACCENT = isDark ? "#fff" : "#000";
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const {
    seconds,
    running,
    start,
    pause,
    exercises,
    removeExercise,
    reorderExercises,
    setCurrentExercise,
  } = useWorkoutTimer();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  // Apple-home-screen edit mode: entered by long-pressing a card (with or
  // without dragging), exited via the Done button. While editing, cards
  // wobble, minus badges appear, and card taps stop navigating.
  const [isEditing, setIsEditing] = useState(false);
  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;

  // Keep the imperative tap guard in sync immediately rather than waiting for
  // React to commit the edit-mode state change after a drag starts or ends.
  const enterEditMode = useCallback(() => {
    isEditingRef.current = true;
    setIsEditing(true);
  }, []);
  const exitEditMode = useCallback(() => {
    isEditingRef.current = false;
    setIsEditing(false);
  }, []);

  // Nothing left to edit; leave the mode rather than stranding the Done
  // button next to an empty list.
  useEffect(() => {
    if (isEditing && exercises.length === 0) exitEditMode();
  }, [isEditing, exercises.length, exitEditMode]);

  // Deletion is edit-mode only now (the minus badge); route removeExercise
  // through a ref so the memoized rows keep a stable callback identity.
  const removeExerciseRef = useRef(removeExercise);
  removeExerciseRef.current = removeExercise;
  const confirmDelete = useCallback((id: string) => {
    Alert.alert(
      "Delete Exercise",
      "Are you sure you want to remove this exercise?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeExerciseRef.current(id),
        },
      ],
    );
  }, []);

  // Drag haptics fired manually with expo-haptics: sortables' hapticsEnabled
  // needs react-native-haptic-feedback's native module, which is not linked
  // into our build. Mirrors its pattern: medium on lift, light per swap,
  // medium on release.
  const handleDragStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    enterEditMode();
  }, [enterEditMode]);

  const handleOrderChange = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const openExercise = useCallback(
    (ex: WorkoutExercise) => {
      // In edit mode a tap on the card body does nothing, matching the home
      // screen (icons don't launch mid-jiggle).
      if (isEditingRef.current) return;
      setCurrentExercise(ex.workoutExerciseId);
      navigation.replace("ExerciseDetail", { exercise: ex });
    },
    [navigation, setCurrentExercise],
  );

  const t: Theme = isDark ? DARK_THEME : LIGHT_THEME;

  const renderExerciseCard = useCallback<
    SortableGridRenderItem<WorkoutExercise>
  >(
    ({ item, index }) => (
      <ExerciseRow
        ex={item}
        index={index}
        t={isDark ? DARK_THEME : LIGHT_THEME}
        globalUnit={globalUnit}
        isEditing={isEditing}
        onTap={openExercise}
        onLongPress={enterEditMode}
        onDeleteTap={confirmDelete}
      />
    ),
    [isDark, globalUnit, isEditing, openExercise, enterEditMode, confirmDelete],
  );

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0",
    )}`;

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const totalSets = exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.reps && s.weight).length,
    0,
  );

  const footerShadow = isDark
    ? null
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 4,
      };

  return (
    // Tapping anywhere outside the cards exits edit mode, like tapping the
    // wallpaper on the home screen. The root only claims touches that no
    // descendant wants: buttons claim their own, and each exercise row
    // claims its touches below, so only "background" taps land here. A
    // scroll steals the responder mid-gesture, so scrolling never exits.
    <View
      style={[styles.container, { backgroundColor: t.bg }]}
      onStartShouldSetResponder={() => isEditing}
      onResponderRelease={exitEditMode}
    >
      <FloatingCloseButton onPress={() => dismissWorkoutFlow(navigation)} />

      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + 68,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroBlock}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: running ? LIVE : t.textFaint },
              ]}
            />
            <Text style={[styles.overline, { color: t.textMuted }]}>
              {running ? "IN PROGRESS" : "PAUSED"}
            </Text>
          </View>
          <Text
            style={[styles.heroTitle, { color: t.text, fontFamily: SERIF }]}
            maxFontSizeMultiplier={1}
          >
            {today}
          </Text>

          <View style={styles.metricsRow}>
            <Metric label="Time" value={formatTime(seconds)} t={t} />
            <Metric label="Exercises" value={exercises.length} t={t} />
            <Metric label="Sets" value={totalSets} t={t} />
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.exercisesSection}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: t.textMuted }]}>
              EXERCISES
            </Text>
            {isEditing && (
              <TouchableOpacity
                onPress={exitEditMode}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Text style={[styles.doneButton, { color: ACCENT }]}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          <Sortable.Grid
            data={exercises}
            keyExtractor={(ex) => ex.workoutExerciseId}
            renderItem={renderExerciseCard}
            rowGap={6}
            activeItemScale={1.04}
            inactiveItemOpacity={0.7}
            overDrag="none"
            scrollableRef={scrollRef}
            onDragStart={handleDragStart}
            onOrderChange={handleOrderChange}
            onDragEnd={({ indexToKey }) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                () => {},
              );
              reorderExercises([...indexToKey]);
            }}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              navigation.replace("ExerciseSelect", {
                returnTo: "WorkoutSummary",
              })
            }
            style={[styles.addExerciseBtn, { borderColor: t.chipBorder }]}
          >
            <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
              <Path
                d="M8 3v10M3 8h10"
                stroke={t.text}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={[styles.addExerciseText, { color: t.text }]}>
              Add exercise
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footerWrap,
          {
            backgroundColor: t.bg,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {running ? (
          <View
            style={[
              styles.footerCard,
              footerShadow,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.footerBtn}
              onPress={pause}
            >
              <Text style={[styles.footerBtnText, { color: t.text }]}>
                Pause
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.footerBtn, { backgroundColor: DESTRUCTIVE }]}
              onPress={() => {
                exitEditMode();
                navigation.navigate("WorkoutComplete");
              }}
            >
              <Text style={[styles.footerBtnText, { color: "#fff" }]}>
                Finish
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={start}
            style={[styles.resumeBtn, { backgroundColor: ACCENT }]}
          >
            <Text
              style={[styles.resumeText, { color: isDark ? "#000" : "#fff" }]}
            >
              Resume
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Memoized row: every prop is referentially stable across the ~100ms timer
// ticks, so rows only re-render when their exercise, the theme, or edit mode
// changes. Sortable.Touchable replaces the old manual onTouchStart/onTouchEnd
// tap check. Its tap and drag gestures may both recognize, so openExercise also
// checks the synchronously updated edit-mode ref before navigating.
const ExerciseRow = React.memo(function ExerciseRow({
  ex,
  index,
  t,
  globalUnit,
  isEditing,
  onTap,
  onLongPress,
  onDeleteTap,
}: {
  ex: WorkoutExercise;
  index: number;
  t: Theme;
  globalUnit: ReturnType<typeof useUnitPreference>["weightUnit"];
  isEditing: boolean;
  onTap: (ex: WorkoutExercise) => void;
  onLongPress: () => void;
  onDeleteTap: (id: string) => void;
}) {
  const { activationAnimationProgress } = useItemContext();

  const wobble = useSharedValue(0);
  const badgeProgress = useSharedValue(0);

  useEffect(() => {
    if (isEditing) {
      // Alternate direction and stagger the phase by index so the cards
      // don't wobble in lockstep.
      const dir = index % 2 === 0 ? 1 : -1;
      wobble.value = withDelay(
        (index % 3) * 45,
        withRepeat(
          withSequence(
            withTiming(dir * WOBBLE_DEG, {
              duration: WOBBLE_MS,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(-dir * WOBBLE_DEG, {
              duration: WOBBLE_MS,
              easing: Easing.inOut(Easing.sin),
            }),
          ),
          -1,
          false,
        ),
      );
      badgeProgress.value = withTiming(1, { duration: 160 });
    } else {
      cancelAnimation(wobble);
      wobble.value = withTiming(0, { duration: 120 });
      badgeProgress.value = withTiming(0, { duration: 120 });
    }
  }, [isEditing, index, wobble, badgeProgress]);

  // The lifted card stops wobbling, like the home screen: blend the rotation
  // out with the lift animation instead of snapping it to zero.
  const wobbleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotateZ: `${wobble.value * (1 - activationAnimationProgress.value)}deg`,
      },
    ],
  }));

  // Scale-only pop (no opacity): a glass effect under an alpha-animating
  // ancestor renders as nothing, so the badge must never animate opacity.
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.max(0.01, badgeProgress.value) }],
  }));

  const last =
    [...ex.sets].reverse().find((s) => s.reps !== "" && s.weight !== "") ||
    null;
  const rowUnit = ex.weightUnit ?? globalUnit;

  return (
    // While editing, the row claims its touches so card taps don't bubble to
    // the screen root's tap-outside-exits responder (the card's own gestures
    // are gesture-handler based and ignore the JS responder system).
    <Animated.View
      style={wobbleStyle}
      onStartShouldSetResponder={() => isEditing}
    >
      <View style={styles.exerciseCardWrapper}>
        <Sortable.Touchable onTap={() => onTap(ex)} onLongPress={onLongPress}>
          <View
            style={[
              styles.exerciseCard,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
              },
            ]}
          >
            <View style={styles.exerciseNameCol}>
              <Text
                style={[styles.exerciseName, { color: t.text }]}
                numberOfLines={1}
              >
                {ex.name}
              </Text>
            </View>

            <View style={styles.lastSetCol}>
              {last ? (
                <>
                  <Text style={[styles.lastSetLabel, { color: t.textMuted }]}>
                    LAST SET
                  </Text>
                  <Text style={[styles.lastSetValue, { color: t.text }]}>
                    {last.reps}×
                    {toDisplayWeight(Number(last.weight) || 0, rowUnit)}
                    <Text style={[styles.lastSetUnit, { color: t.textFaint }]}>
                      {" "}
                      {rowUnit}
                    </Text>
                  </Text>
                </>
              ) : (
                <Text style={[styles.notStarted, { color: t.textFaint }]}>
                  Not started
                </Text>
              )}
            </View>

            <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
              <Path
                d="M6 3l5 5-5 5"
                stroke={t.textFaint}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Sortable.Touchable>
      </View>

      <Animated.View
        style={[styles.deleteBadgeWrap, badgeStyle]}
        pointerEvents={isEditing ? "auto" : "none"}
        // Rasterize the glass badge while the wobble runs: live glass
        // re-refracts its backdrop every frame it moves, which drops frames
        // with one badge per card. Off at rest so the glass stays live.
        shouldRasterizeIOS={isEditing}
      >
        <Sortable.Touchable onTap={() => onDeleteTap(ex.workoutExerciseId)}>
          <View style={styles.deleteBadgeHit}>
            {isLiquidGlassAvailable() ? (
              <GlassView style={styles.deleteBadge} glassEffectStyle="regular">
                <View
                  style={[
                    styles.deleteBadgeMinus,
                    { backgroundColor: t.badgeGlyph },
                  ]}
                />
              </GlassView>
            ) : (
              <View
                style={[
                  styles.deleteBadge,
                  styles.deleteBadgeFallback,
                  { backgroundColor: t.badgeBg, borderColor: t.border },
                ]}
              >
                <View
                  style={[
                    styles.deleteBadgeMinus,
                    { backgroundColor: t.badgeGlyph },
                  ]}
                />
              </View>
            )}
          </View>
        </Sortable.Touchable>
      </Animated.View>
    </Animated.View>
  );
});

function Metric({
  label,
  value,
  t,
}: {
  label: string;
  value: string | number;
  t: Theme;
}) {
  return (
    <View>
      <Text style={[styles.metricLabel, { color: t.textMuted }]}>{label}</Text>
      <Text
        style={[styles.metricValue, { color: t.text }]}
        maxFontSizeMultiplier={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBlock: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  overline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "400",
    letterSpacing: -0.2,
    lineHeight: 38,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 28,
    alignItems: "flex-start",
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
  exercisesSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  doneButton: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  exerciseCardWrapper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  // Badge sits outside exerciseCardWrapper (which clips to the rounded
  // corners) so it can overlap the card's top-left corner uncropped. The
  // 34pt hit target is transparent; the visible 22pt circle protrudes 5pt
  // past the corner, staying inside the 6pt row gap.
  deleteBadgeWrap: {
    position: "absolute",
    top: -11,
    left: -11,
  },
  deleteBadgeHit: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  deleteBadgeFallback: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteBadgeMinus: {
    width: 10,
    height: 2,
    borderRadius: 1,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exerciseNameCol: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  lastSetCol: {
    alignItems: "flex-end",
  },
  lastSetLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  lastSetValue: {
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  lastSetUnit: {
    fontSize: 11,
    fontWeight: "400",
  },
  notStarted: {
    fontSize: 12,
    fontWeight: "500",
    fontStyle: "italic",
  },
  addExerciseBtn: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addExerciseText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  footerWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  footerCard: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    gap: 2,
  },
  footerBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  resumeBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  resumeText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
