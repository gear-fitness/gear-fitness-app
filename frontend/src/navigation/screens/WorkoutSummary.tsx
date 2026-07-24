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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Animated, {
  Easing,
  cancelAnimation,
  measure,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import Sortable, {
  useCommonValuesContext,
  useItemContext,
} from "react-native-sortables";
import * as Haptics from "expo-haptics";
import type {
  SortableGridRenderItem,
  SortStrategyFactory,
} from "react-native-sortables";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import { useWorkoutTimer, WorkoutExercise } from "../../context/WorkoutContext";
import { SupersetLinkIcon } from "../../components/SupersetLinkIcon";
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

// The sortable grid works in BLOCKS: a block is either a single exercise or a
// whole superset group (a consecutive run of 2+ exercises sharing a
// supersetGroup). Keys must be stable across membership changes, so superset
// blocks are keyed by their group id and singles by workoutExerciseId.
type SummaryBlock =
  | { key: string; kind: "single"; exercise: WorkoutExercise }
  | { key: string; kind: "group"; members: WorkoutExercise[] };

function buildBlocks(exercises: WorkoutExercise[]): SummaryBlock[] {
  const blocks: SummaryBlock[] = [];
  // Mirrors the server adjacency rule: only CONSECUTIVE members render as a
  // group. Degraded data (a group id split across two runs, or a singleton)
  // falls back to single blocks, which also keeps every key unique.
  const usedGroupKeys = new Set<string>();
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    const groupId = ex.supersetGroup;
    if (groupId !== undefined && !usedGroupKeys.has(`sg-${groupId}`)) {
      const members: WorkoutExercise[] = [ex];
      let j = i + 1;
      while (j < exercises.length && exercises[j].supersetGroup === groupId) {
        members.push(exercises[j]);
        j++;
      }
      if (members.length >= 2) {
        const key = `sg-${groupId}`;
        usedGroupKeys.add(key);
        blocks.push({ key, kind: "group", members });
        i = j;
        continue;
      }
    }
    blocks.push({ key: ex.workoutExerciseId, kind: "single", exercise: ex });
    i++;
  }
  return blocks;
}

// ---- Folder-style drop-to-link (iOS home screen folders) ----
// Every card is split into three horizontal zones for the dragged card's
// CENTER (the grid's default reorder trigger origin). The top and bottom edge
// bands reorder like normal; the middle band is a drop dead zone: the card
// underneath stops fleeing, arms as a link target after a short dwell, and
// releasing there merges the two into a superset. Dragging a group block
// never links (groups only reorder), mirroring iOS folders-into-folders.
const DROP_EDGE_MAX = 26;
const DROP_EDGE_RATIO = 0.3;
const HOVER_ARM_DELAY_MS = 140;
const HOVER_SCALE = 0.04;

// Builds the grid's ordering strategy. The library calls the returned
// function as a hook inside its provider tree, so it can read the live drag
// context; the updater it returns runs as a worklet on every trigger-position
// change. Returning undefined means "no reorder", which is what makes the
// hovered card hold still.
//
// IDENTITY MATTERS: the grid keys its whole inner tree by the strategy's
// function identity (useStrategyKey), so a new strategy object forces a full
// remount of every card, which reads as the list glitching on the drop that
// changed the data. Everything dynamic therefore comes in through shared
// values (stable identities), and the factory itself must be created exactly
// once per screen.
function createFolderDropStrategy(config: {
  hoverTargetKey: SharedValue<null | string>;
  isGroupKey: SharedValue<Record<string, boolean>>;
}): SortStrategyFactory {
  const { hoverTargetKey, isGroupKey } = config;
  return function useFolderDropStrategy() {
    const { indexToKey, itemPositions, itemHeights, containerHeight } =
      useCommonValuesContext();
    return ({
      activeIndex,
      activeKey,
      dimensions,
      position,
    }: {
      activeIndex: number;
      activeKey: string;
      dimensions: { height: number };
      position: { x: number; y: number };
    }) => {
      "worklet";
      const order = indexToKey.value;
      const positions = itemPositions.value;
      const heights = itemHeights.value;
      const canLink = !isGroupKey.value[activeKey];

      // Reachability remap. overDrag "none" clamps the lifted card inside
      // the container, so its center can only travel within half its own
      // height of either end. Without correction the first/last blocks'
      // outer bands (and against a short end block, the entire above/below
      // outcome) sit in physically unreachable space: with one single and
      // one group, the single's center pins inside the group's middle band
      // and every drag reads as "join". Linearly stretch the reachable
      // center span back over the full content span before zoning; for long
      // lists this is near-identity, for two blocks it compresses the zones
      // to what the finger can actually express.
      let y = position.y;
      const ch = containerHeight.value;
      if (ch !== null && ch > dimensions.height) {
        y = ((y - dimensions.height / 2) * ch) / (ch - dimensions.height);
      }

      // Walk the cards in visual order (list order matches layout order) and
      // classify the pointer against each card's zones. Positions are the
      // cards' CURRENT layout targets, so the zones move with live reorders
      // and the result is self-stabilizing: once an item is displaced, the
      // pointer lands inside the dragged card's own hole and nothing flips
      // back.
      let hover: null | string = null;
      let insertAt: null | number = null;
      let passed = 0;
      for (const key of order) {
        if (key === activeKey) continue;
        const pos = positions[key];
        const h = typeof heights === "number" ? heights : heights?.[key];
        if (!pos || !h) continue;
        const edge = Math.min(DROP_EDGE_MAX, h * DROP_EDGE_RATIO);
        if (y < pos.y + edge) {
          // Above this card or in its top band: sit before it.
          insertAt = passed;
          break;
        }
        if (y <= pos.y + h - edge) {
          // Middle band: park as a drop target, or, for a dragged group,
          // fall back to a plain center-split reorder.
          if (canLink) hover = key;
          else insertAt = y < pos.y + h / 2 ? passed : passed + 1;
          break;
        }
        passed++;
      }

      if (hover !== null) {
        if (hoverTargetKey.value !== hover) hoverTargetKey.value = hover;
        return undefined;
      }
      if (hoverTargetKey.value !== null) hoverTargetKey.value = null;
      if (insertAt === null) insertAt = passed;
      if (insertAt === activeIndex) return undefined;
      const next = [...order];
      next.splice(activeIndex, 1);
      next.splice(insertAt, 0, activeKey);
      return next;
    };
  };
}

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
    unlinkExercise,
    linkExercises,
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

  // The corner badge on a superset block unlinks the whole group. Wording is
  // deliberately non-destructive: nothing is deleted, the exercises just stop
  // being grouped. Same ref pattern as removeExercise so the memoized block
  // rows keep a stable callback identity.
  const unlinkExerciseRef = useRef(unlinkExercise);
  unlinkExerciseRef.current = unlinkExercise;
  const confirmUnlinkGroup = useCallback((members: WorkoutExercise[]) => {
    Alert.alert(
      "Remove superset?",
      "The exercises and their sets are kept. They just stop being grouped.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            for (const member of members) {
              unlinkExerciseRef.current(member.workoutExerciseId);
            }
          },
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

  // Blocks depend only on `exercises`, so the ~100ms timer ticks reuse the
  // same block objects and the memoized rows below skip re-rendering.
  const blocks = useMemo(() => buildBlocks(exercises), [exercises]);

  // Block key -> member workoutExerciseIds, for expanding a drag result back
  // into the flat id list reorderExercises expects.
  const blockIdsByKey = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const block of blocks) {
      map.set(
        block.key,
        block.kind === "group"
          ? block.members.map((m) => m.workoutExerciseId)
          : [block.exercise.workoutExerciseId],
      );
    }
    return map;
  }, [blocks]);

  // Drop-to-link state. hoverTargetKey is written by the drag strategy
  // worklet while the dragged card's center parks on another card;
  // hoverArm animates 0..1 after the dwell delay (it drives the target's
  // highlight scale); hoverArmed is the single-write boolean the JS-side
  // drop handler reads (a mid-animation value would be unreliable across
  // threads at release time).
  const hoverTargetKey = useSharedValue<null | string>(null);
  const hoverArm = useSharedValue(0);
  const hoverArmed = useSharedValue(false);

  // Which block keys are groups, exposed to the strategy worklet through a
  // shared value so the strategy's identity NEVER changes: the grid remounts
  // all of its cards whenever the strategy object changes (it keys the inner
  // tree by strategy identity), which would visibly glitch the list on every
  // reorder commit.
  const isGroupKeySV = useSharedValue<Record<string, boolean>>({});
  const isGroupKey = useMemo(() => {
    const rec: Record<string, boolean> = {};
    for (const block of blocks) {
      if (block.kind === "group") rec[block.key] = true;
    }
    return rec;
  }, [blocks]);
  useEffect(() => {
    isGroupKeySV.value = isGroupKey;
  }, [isGroupKey, isGroupKeySV]);

  const dropStrategy = useMemo(
    () =>
      createFolderDropStrategy({ hoverTargetKey, isGroupKey: isGroupKeySV }),
    [hoverTargetKey, isGroupKeySV],
  );

  const hoverHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  // Dwell arming: entering a card's dead zone starts the delayed rise, so a
  // fast drag straight through a card never arms; leaving (or switching
  // targets) collapses it.
  useAnimatedReaction(
    () => hoverTargetKey.value,
    (curr, prev) => {
      if (curr !== null) {
        if (curr !== prev) {
          hoverArm.value = 0;
          hoverArm.value = withDelay(
            HOVER_ARM_DELAY_MS,
            withTiming(1, { duration: 160 }),
          );
        }
      } else if (prev !== null) {
        hoverArm.value = withTiming(0, { duration: 120 });
      }
    },
    [hoverTargetKey, hoverArm],
  );

  useAnimatedReaction(
    () => hoverArm.value > 0.35,
    (armed, prevArmed) => {
      if (armed === prevArmed) return;
      const on = armed && hoverTargetKey.value !== null;
      hoverArmed.value = on;
      if (on) runOnJS(hoverHaptic)();
    },
    [hoverArm, hoverArmed, hoverTargetKey, hoverHaptic],
  );

  // Member drag-out state. The worklet side (position, visibility) lives in
  // shared values; ghostExercise is the React content of the floating copy
  // rendered at the screen root.
  const [ghostExercise, setGhostExercise] = useState<null | WorkoutExercise>(
    null,
  );
  const ghostActive = useSharedValue(false);
  const ghostOrigin = useSharedValue({ x: 0, y: 0, w: 0, h: 0 });
  const ghostTx = useSharedValue(0);
  const ghostTy = useSharedValue(0);
  const ghostMemberId = useSharedValue<null | string>(null);
  const memberRowFrames = useSharedValue<
    Record<string, { y: number; h: number }>
  >({});
  const withinTargetIdx = useSharedValue<null | number>(null);

  const beginMemberDrag = useCallback((member: WorkoutExercise) => {
    setGhostExercise(member);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  const clearMemberDrag = useCallback(() => setGhostExercise(null), []);

  // Outcome of a member drag: released parked on another block (armed) moves
  // the member there (unlink, then link, which also reseats it adjacent);
  // released anywhere else outside its own card unlinks AND lands the member
  // at the drop slot (before the block the worklet identified, or at the
  // end). Released inside the card the gesture snaps back and never reaches
  // here.
  const commitMemberDrag = useCallback(
    (
      memberId: string,
      linkTargetKey: null | string,
      escaped: boolean,
      insertBeforeKey: null | string,
    ) => {
      const targetIds =
        linkTargetKey !== null ? blockIdsByKey.get(linkTargetKey) : undefined;
      if (targetIds?.length) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        unlinkExerciseRef.current(memberId);
        linkExercises(targetIds[targetIds.length - 1], memberId);
      } else if (escaped) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        // Unlink first (clears the group; a 2-member group dissolves), then
        // override its default reseat with the flat order for the drop
        // slot: every block keeps its members in place, minus the dragged
        // one, which lands before insertBeforeKey's block (or last).
        unlinkExerciseRef.current(memberId);
        const ids: string[] = [];
        let placed = false;
        for (const block of blocks) {
          if (block.key === insertBeforeKey) {
            ids.push(memberId);
            placed = true;
          }
          for (const id of blockIdsByKey.get(block.key) ?? []) {
            if (id !== memberId) ids.push(id);
          }
        }
        if (!placed) ids.push(memberId);
        reorderExercises(ids);
      }
      setGhostExercise(null);
    },
    [blocks, blockIdsByKey, linkExercises, reorderExercises],
  );

  // Within-group reorder: the member moves to slot `insertIdx` among its
  // group's other members; the group itself and every other block stay put.
  const commitWithinGroup = useCallback(
    (memberId: string, blockKey: string, insertIdx: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const ids: string[] = [];
      for (const block of blocks) {
        const blockIds = blockIdsByKey.get(block.key) ?? [];
        if (block.key === blockKey) {
          const others = blockIds.filter((id) => id !== memberId);
          others.splice(insertIdx, 0, memberId);
          ids.push(...others);
        } else {
          ids.push(...blockIds);
        }
      }
      reorderExercises(ids);
      setGhostExercise(null);
      // ghostMemberId/withinTargetIdx stay set through the commit render so
      // the shifted rows hold their arrangement (the shift formula computes
      // to zero against the new order); clear them once the new order is on
      // screen.
      requestAnimationFrame(() => {
        ghostMemberId.value = null;
        withinTargetIdx.value = null;
      });
    },
    [blocks, blockIdsByKey, reorderExercises, ghostMemberId, withinTargetIdx],
  );

  const memberDrag = useMemo<MemberDragController>(
    () => ({
      ghostActive,
      ghostOrigin,
      ghostTx,
      ghostTy,
      ghostMemberId,
      hoverTargetKey,
      hoverArm,
      hoverArmed,
      memberRowFrames,
      withinTargetIdx,
      begin: beginMemberDrag,
      commit: commitMemberDrag,
      commitWithin: commitWithinGroup,
      clear: clearMemberDrag,
    }),
    [
      ghostActive,
      ghostOrigin,
      ghostTx,
      ghostTy,
      ghostMemberId,
      hoverTargetKey,
      hoverArm,
      hoverArmed,
      memberRowFrames,
      withinTargetIdx,
      beginMemberDrag,
      commitMemberDrag,
      commitWithinGroup,
      clearMemberDrag,
    ],
  );

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghostActive.value ? 1 : 0,
    left: ghostOrigin.value.x,
    top: ghostOrigin.value.y,
    width: ghostOrigin.value.w,
    height: ghostOrigin.value.h,
    transform: [
      { translateX: ghostTx.value },
      { translateY: ghostTy.value },
      { scale: ghostActive.value ? 1.03 : 1 },
    ],
  }));

  const renderBlock = useCallback<SortableGridRenderItem<SummaryBlock>>(
    ({ item, index }) =>
      item.kind === "group" ? (
        <SupersetBlockRow
          blockKey={item.key}
          members={item.members}
          index={index}
          t={isDark ? DARK_THEME : LIGHT_THEME}
          globalUnit={globalUnit}
          isEditing={isEditing}
          hoverTargetKey={hoverTargetKey}
          hoverArm={hoverArm}
          memberDrag={memberDrag}
          onTap={openExercise}
          onLongPress={enterEditMode}
          onDeleteTap={confirmDelete}
          onUnlinkTap={confirmUnlinkGroup}
        />
      ) : (
        <ExerciseRow
          ex={item.exercise}
          index={index}
          t={isDark ? DARK_THEME : LIGHT_THEME}
          globalUnit={globalUnit}
          isEditing={isEditing}
          hoverTargetKey={hoverTargetKey}
          hoverArm={hoverArm}
          onTap={openExercise}
          onLongPress={enterEditMode}
          onDeleteTap={confirmDelete}
        />
      ),
    [
      isDark,
      globalUnit,
      isEditing,
      hoverTargetKey,
      hoverArm,
      memberDrag,
      openExercise,
      enterEditMode,
      confirmDelete,
      confirmUnlinkGroup,
    ],
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
            data={blocks}
            keyExtractor={(block) => block.key}
            renderItem={renderBlock}
            rowGap={6}
            activeItemScale={1.04}
            inactiveItemOpacity={0.7}
            overDrag="none"
            // Only animate positions during an active drag. Data commits snap:
            // the library keeps per-key positions across unmounts, so an
            // exercise re-entering as a single (member dragged out of a group)
            // would otherwise animate in from its stale pre-link position
            // (visibly sliding bottom-to-top on a drop near the top).
            itemsLayoutTransitionMode="reorder"
            strategy={dropStrategy}
            scrollableRef={scrollRef}
            onDragStart={handleDragStart}
            onOrderChange={handleOrderChange}
            onDragEnd={({ key, fromIndex, toIndex, indexToKey }) => {
              // Folder-style drop: released while parked on another card
              // with the dwell arming elapsed links the dragged exercise
              // with (or into) the target instead of reordering.
              const targetKey = hoverTargetKey.value;
              const armed = hoverArmed.value;
              hoverTargetKey.value = null;
              hoverArm.value = 0;
              hoverArmed.value = false;
              if (targetKey !== null && armed && targetKey !== key) {
                const draggedIds = blockIdsByKey.get(key);
                const targetIds = blockIdsByKey.get(targetKey);
                if (draggedIds?.length === 1 && targetIds?.length) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                    () => {},
                  );
                  // Commit any reordering from earlier in the drag first;
                  // linkExercises then reseats the dragged exercise right
                  // after its new group regardless of where the drag left it.
                  if (fromIndex !== toIndex) {
                    reorderExercises(
                      [...indexToKey].flatMap(
                        (k) => blockIdsByKey.get(k) ?? [],
                      ),
                    );
                  }
                  linkExercises(targetIds[targetIds.length - 1], draggedIds[0]);
                  return;
                }
              }
              // A long-press that never moves the card (entering edit mode to
              // reach the delete badge) still ends a drag. Skip the confirm
              // haptic (handleDragStart already fired one) and the no-op
              // reorder commit, which would trigger an immediate draft save.
              if (fromIndex === toIndex) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                () => {},
              );
              // Expand the new BLOCK order back into the flat id list the
              // key-based reorderExercises expects; a superset block
              // contributes all of its members in place.
              reorderExercises(
                [...indexToKey].flatMap((key) => blockIdsByKey.get(key) ?? []),
              );
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

      {/* Floating copy of the member being dragged out of its superset. It
          renders at the root (the real row is clipped inside its card) and
          rides shared values, so it tracks the finger on the UI thread. */}
      {ghostExercise && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.memberGhost,
            {
              backgroundColor: t.surface,
              borderColor: t.chipBorder,
            },
            ghostStyle,
          ]}
        >
          <RowBody ex={ghostExercise} t={t} globalUnit={globalUnit} />
        </Animated.View>
      )}
    </View>
  );
}

// Shared edit-mode animation state for a sortable block: the jiggle rotation,
// the corner badge's scale-only pop, and the drop-target highlight (a scale
// pop driven by the drag strategy's hover arming). Used by both single rows
// and superset blocks, so a whole group wobbles and highlights as ONE item.
function useJiggle(
  isEditing: boolean,
  index: number,
  blockKey: string,
  hoverTargetKey: SharedValue<null | string>,
  hoverArm: SharedValue<number>,
) {
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
  // out with the lift animation instead of snapping it to zero. The hover
  // scale rides the same transform (two animated styles on one view would
  // clobber each other's transform arrays). Scale-only, mirroring the badge:
  // the corner badge is glass and must never sit under animating opacity.
  const wobbleStyle = useAnimatedStyle(() => {
    const hover = hoverTargetKey.value === blockKey ? hoverArm.value : 0;
    return {
      transform: [
        {
          rotateZ: `${wobble.value * (1 - activationAnimationProgress.value)}deg`,
        },
        { scale: 1 + HOVER_SCALE * hover },
      ],
    };
  });

  // Scale-only pop (no opacity): a glass effect under an alpha-animating
  // ancestor renders as nothing, so the badge must never animate opacity.
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.max(0.01, badgeProgress.value) }],
  }));

  return { wobbleStyle, badgeStyle };
}

// The protruding glass corner badge shown in edit mode. On a single exercise
// it deletes; on a superset block it unlinks the whole group.
function CornerBadge({
  t,
  isEditing,
  badgeStyle,
  onTap,
}: {
  t: Theme;
  isEditing: boolean;
  badgeStyle: ReturnType<typeof useAnimatedStyle>;
  onTap: () => void;
}) {
  return (
    <Animated.View
      style={[styles.deleteBadgeWrap, badgeStyle]}
      pointerEvents={isEditing ? "auto" : "none"}
      // Rasterize the glass badge while the wobble runs: live glass
      // re-refracts its backdrop every frame it moves, which drops frames
      // with one badge per card. Off at rest so the glass stays live.
      shouldRasterizeIOS={isEditing}
    >
      <Sortable.Touchable onTap={onTap}>
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
  );
}

// The name + LAST SET + chevron line shared by single cards and superset
// member rows (the containers differ, the content does not).
function RowBody({
  ex,
  t,
  globalUnit,
  hideChevron,
}: {
  ex: WorkoutExercise;
  t: Theme;
  globalUnit: ReturnType<typeof useUnitPreference>["weightUnit"];
  // Member rows swap the chevron for the drag-out grip in edit mode.
  hideChevron?: boolean;
}) {
  const last =
    [...ex.sets].reverse().find((s) => s.reps !== "" && s.weight !== "") ||
    null;
  const rowUnit = ex.weightUnit ?? globalUnit;

  return (
    <>
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
              {last.reps}×{toDisplayWeight(Number(last.weight) || 0, rowUnit)}
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

      {!hideChevron && (
        <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
          <Path
            d="M6 3l5 5-5 5"
            stroke={t.textFaint}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </>
  );
}

// Three-line grabber shown on member rows in edit mode: the drag source for
// pulling a member out of its superset.
function GripGlyph({ color }: { color: string }) {
  return (
    <Svg width={14} height={12} viewBox="0 0 14 12" fill="none">
      <Path
        d="M1 2h12M1 6h12M1 10h12"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Everything a member row needs to run the drag-out gesture. The shared
// values live in WorkoutSummary (the ghost overlay renders at the screen
// root, above the scroll view); the callbacks bridge back to JS for the
// ghost's React content and the commit.
type MemberDragController = {
  ghostActive: SharedValue<boolean>;
  ghostOrigin: SharedValue<{ x: number; y: number; w: number; h: number }>;
  ghostTx: SharedValue<number>;
  ghostTy: SharedValue<number>;
  ghostMemberId: SharedValue<null | string>;
  hoverTargetKey: SharedValue<null | string>;
  hoverArm: SharedValue<number>;
  hoverArmed: SharedValue<boolean>;
  // Member row frames (y/height relative to the group card), measured via
  // onLayout, keyed by workoutExerciseId. The drop worklet uses them to
  // resolve a within-group drop to a member slot.
  memberRowFrames: SharedValue<Record<string, { y: number; h: number }>>;
  // Live within-group target slot (insert index among the group's other
  // members) while the ghost is over its own card; null otherwise. Member
  // rows read it to shift out of the way, mirroring the list's live reorder.
  withinTargetIdx: SharedValue<null | number>;
  begin: (member: WorkoutExercise) => void;
  commit: (
    memberId: string,
    linkTargetKey: null | string,
    escaped: boolean,
    insertBeforeKey: null | string,
  ) => void;
  // Reorder within the own group: member moved to slot `insertIdx` among the
  // group's OTHER members.
  commitWithin: (memberId: string, blockKey: string, insertIdx: number) => void;
  clear: () => void;
};

// One member row inside a superset block. In edit mode it grows the inline
// minus (delete) on the left and the drag-out grip on the right: hold the
// grip briefly and pull the member out of the card. A ghost copy follows the
// finger above the whole screen; releasing outside the group unlinks, and
// parking on another card first (same hover arming as the folder drop)
// moves the member into that group or pairs it with that single. The grip's
// pan explicitly blocks the surrounding block's drag gesture, so holding or
// dragging the grip can never lift the whole group; the rest of the card
// still drags the block like before.
function GroupMemberRow({
  member,
  memberIndex,
  blockKey,
  groupMemberIds,
  t,
  globalUnit,
  isEditing,
  drag,
  onTap,
  onLongPress,
  onDeleteTap,
}: {
  member: WorkoutExercise;
  memberIndex: number;
  blockKey: string;
  // The group's member ids in display order, for resolving within-group drops.
  groupMemberIds: string[];
  t: Theme;
  globalUnit: ReturnType<typeof useUnitPreference>["weightUnit"];
  isEditing: boolean;
  drag: MemberDragController;
  onTap: (ex: WorkoutExercise) => void;
  onLongPress: () => void;
  onDeleteTap: (id: string) => void;
}) {
  const rowRef = useAnimatedRef<Animated.View>();
  const { gesture: itemGesture } = useItemContext();
  const {
    containerRef,
    containerHeight,
    indexToKey,
    itemPositions,
    itemHeights,
  } = useCommonValuesContext();
  // Window Y of the sortable container, measured at drag start, to translate
  // the ghost's window position into the container coordinates itemPositions
  // uses. Frames are static during a member drag (no autoscroll), so a
  // one-shot measurement holds.
  const containerWinY = useSharedValue(0);
  // Unclamped finger translation. The ghost VISUAL is clamped to the
  // container, but drop classification follows the finger: otherwise a
  // group sitting at the list's edge is inescapable (the clamped center can
  // never cross the card's boundary, and drag-out becomes impossible).
  const ghostRawTy = useSharedValue(0);
  const {
    ghostActive,
    ghostOrigin,
    ghostTy,
    ghostMemberId,
    hoverTargetKey,
    hoverArm,
    hoverArmed,
    memberRowFrames,
    withinTargetIdx,
    begin,
    commit,
    commitWithin,
    clear,
  } = drag;
  const memberId = member.workoutExerciseId;

  // Dim while this row's ghost is out, and shift live to preview the
  // within-group reorder, mirroring how the list's items move out of the
  // dragged card's way. The dragged row itself translates to the target
  // slot (the vacated gap follows the target), the rows in between shift by
  // the dragged row's height in the opposite direction. Shifts key off the
  // ids, so the one-frame window after a commit (new order rendered, shared
  // values not yet cleared) computes to zero and nothing double-animates.
  const rowStyle = useAnimatedStyle(() => {
    const draggedId = ghostMemberId.value;
    if (draggedId === null) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }
    const isDragged = draggedId === memberId;
    const ids = groupMemberIds;
    const dIdx = ids.indexOf(draggedId);
    const target = withinTargetIdx.value;
    let shift = 0;
    if (target !== null && dIdx !== -1) {
      const frames = memberRowFrames.value;
      if (isDragged) {
        if (target > dIdx) {
          for (let o = dIdx; o < target; o++) {
            shift += frames[ids[o + 1]]?.h ?? 0;
          }
        } else if (target < dIdx) {
          for (let o = target; o < dIdx; o++) {
            shift -= frames[ids[o]]?.h ?? 0;
          }
        }
      } else {
        const selfIdx = ids.indexOf(memberId);
        const othersIdx = selfIdx < dIdx ? selfIdx : selfIdx - 1;
        const draggedH = frames[draggedId]?.h ?? 0;
        if (othersIdx >= dIdx && othersIdx < target) shift = -draggedH;
        else if (othersIdx < dIdx && othersIdx >= target) shift = draggedH;
      }
    }
    return {
      opacity: isDragged && ghostActive.value ? 0.3 : 1,
      transform: [{ translateY: withTiming(shift, { duration: 150 }) }],
    };
  });

  // activateAfterLongPress makes the pan claim the touch after a short hold,
  // which is what lets it win against the outer ScrollView's vertical pan;
  // blocksExternalGesture keeps the sortable block's own drag waiting for as
  // long as a finger is on the grip.
  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .blocksExternalGesture(itemGesture)
    .onStart(() => {
      "worklet";
      const rm = measure(rowRef);
      const cm = measure(containerRef);
      if (!rm || !cm) return;
      ghostOrigin.value = {
        x: rm.pageX,
        y: rm.pageY,
        w: rm.width,
        h: rm.height,
      };
      containerWinY.value = cm.pageY;
      ghostTy.value = 0;
      ghostRawTy.value = 0;
      ghostMemberId.value = memberId;
      ghostActive.value = true;
      runOnJS(begin)(member);
    })
    .onUpdate((e) => {
      "worklet";
      if (ghostMemberId.value !== memberId) return;
      // Contained like the list's own drag (overDrag "none"): horizontal is
      // locked, vertical is clamped to the sortable container's bounds. The
      // clamp is visual only; cy (the classification input) follows the raw
      // finger so edge blocks stay escapable.
      const origin = ghostOrigin.value;
      const minTy = containerWinY.value - origin.y;
      const ch = containerHeight.value;
      const maxTy =
        ch !== null
          ? Math.max(minTy, containerWinY.value + ch - origin.y - origin.h)
          : e.translationY;
      ghostTy.value = Math.min(Math.max(e.translationY, minTy), maxTy);
      ghostRawTy.value = e.translationY;
      const cy = origin.y + e.translationY + origin.h / 2 - containerWinY.value;
      const positions = itemPositions.value;
      const heights = itemHeights.value;
      const own = positions[blockKey];
      const ownH = typeof heights === "number" ? heights : heights?.[blockKey];
      if (own && ownH && cy >= own.y && cy <= own.y + ownH) {
        // Inside the own card: live within-group targeting (rows shift via
        // rowStyle), no cross-block hover.
        const frames = memberRowFrames.value;
        const cyRel = cy - own.y;
        let insertIdx = 0;
        for (const id of groupMemberIds) {
          if (id === memberId) continue;
          const frame = frames[id];
          if (frame && cyRel > frame.y + frame.h / 2) insertIdx++;
        }
        if (withinTargetIdx.value !== insertIdx) {
          withinTargetIdx.value = insertIdx;
        }
        if (hoverTargetKey.value !== null) hoverTargetKey.value = null;
        return;
      }
      if (withinTargetIdx.value !== null) withinTargetIdx.value = null;
      // Outside: hover classification against every OTHER block's middle
      // band. Writing hoverTargetKey feeds the exact same arming/highlight/
      // haptic pipeline the folder drop uses.
      let found: null | string = null;
      for (const key in positions) {
        if (key === blockKey) continue;
        const pos = positions[key];
        const h = typeof heights === "number" ? heights : heights?.[key];
        if (!pos || !h) continue;
        const edge = Math.min(DROP_EDGE_MAX, h * DROP_EDGE_RATIO);
        if (cy > pos.y + edge && cy < pos.y + h - edge) {
          found = key;
          break;
        }
      }
      if (hoverTargetKey.value !== found) hoverTargetKey.value = found;
    })
    .onFinalize(() => {
      "worklet";
      if (ghostMemberId.value !== memberId) return;
      const targetKey = hoverTargetKey.value;
      const armed = hoverArmed.value;
      hoverTargetKey.value = null;
      hoverArm.value = 0;
      hoverArmed.value = false;
      const heights = itemHeights.value;
      const own = itemPositions.value[blockKey];
      const ownH = typeof heights === "number" ? heights : heights?.[blockKey];
      const cy =
        ghostOrigin.value.y +
        ghostRawTy.value +
        ghostOrigin.value.h / 2 -
        containerWinY.value;
      const escaped = !own || !ownH || cy < own.y || cy > own.y + ownH;
      const linkTargetKey = armed && targetKey !== null ? targetKey : null;
      // Drop slot for a plain unlink: the first block (in visual order)
      // whose center sits below the ghost's center; null means the end of
      // the list. The own group is a valid slot too (dropping just above it
      // lands the member right before its old group).
      let insertBeforeKey: null | string = null;
      if (escaped && linkTargetKey === null) {
        const positions = itemPositions.value;
        for (const key of indexToKey.value) {
          const pos = positions[key];
          const bh = typeof heights === "number" ? heights : heights?.[key];
          if (!pos || !bh) continue;
          if (cy < pos.y + bh / 2) {
            insertBeforeKey = key;
            break;
          }
        }
      }
      if (linkTargetKey !== null || escaped) {
        withinTargetIdx.value = null;
        ghostActive.value = false;
        ghostMemberId.value = null;
        runOnJS(commit)(memberId, linkTargetKey, escaped, insertBeforeKey);
        return;
      }
      // Released inside the own card: commit the live target slot if it
      // changed; otherwise snap the ghost home. ghostMemberId and the target
      // stay set through the within-commit so the shifted rows hold their
      // visual arrangement over the commit render (the shift formula
      // computes to zero against the new order); commitWithin clears them a
      // frame later.
      const target = withinTargetIdx.value;
      const selfIdx = groupMemberIds.indexOf(memberId);
      if (own && target !== null && selfIdx !== -1 && target !== selfIdx) {
        ghostActive.value = false;
        runOnJS(commitWithin)(memberId, blockKey, target);
      } else {
        withinTargetIdx.value = null;
        ghostTy.value = withTiming(0, { duration: 150 }, () => {
          ghostActive.value = false;
          ghostMemberId.value = null;
          runOnJS(clear)();
        });
      }
    });

  return (
    <Animated.View
      ref={rowRef}
      style={rowStyle}
      // Card-relative frame of this member's slot (divider included),
      // feeding the within-group drop resolution and live shifts.
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout;
        memberRowFrames.value = {
          ...memberRowFrames.value,
          [memberId]: { y, h: height },
        };
      }}
    >
      {memberIndex > 0 && (
        <View style={[styles.groupDivider, { backgroundColor: t.border }]} />
      )}
      <View style={styles.groupMemberOuter}>
        {isEditing && (
          <Sortable.Touchable onTap={() => onDeleteTap(memberId)}>
            <View style={styles.memberMinusHit}>
              <View
                style={[
                  styles.memberMinusCircle,
                  { backgroundColor: t.badgeBg },
                ]}
              >
                <View
                  style={[
                    styles.deleteBadgeMinus,
                    { backgroundColor: t.badgeGlyph },
                  ]}
                />
              </View>
            </View>
          </Sortable.Touchable>
        )}
        <View style={styles.groupMemberTouchable}>
          <Sortable.Touchable
            onTap={() => onTap(member)}
            onLongPress={onLongPress}
          >
            <View style={styles.groupMemberRow}>
              <RowBody
                ex={member}
                t={t}
                globalUnit={globalUnit}
                hideChevron={isEditing}
              />
            </View>
          </Sortable.Touchable>
        </View>
        {isEditing && (
          <GestureDetector gesture={pan}>
            <Animated.View style={styles.memberGripHit}>
              <GripGlyph color={t.textFaint} />
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </Animated.View>
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
  hoverTargetKey,
  hoverArm,
  onTap,
  onLongPress,
  onDeleteTap,
}: {
  ex: WorkoutExercise;
  index: number;
  t: Theme;
  globalUnit: ReturnType<typeof useUnitPreference>["weightUnit"];
  isEditing: boolean;
  hoverTargetKey: SharedValue<null | string>;
  hoverArm: SharedValue<number>;
  onTap: (ex: WorkoutExercise) => void;
  onLongPress: () => void;
  onDeleteTap: (id: string) => void;
}) {
  const { wobbleStyle, badgeStyle } = useJiggle(
    isEditing,
    index,
    ex.workoutExerciseId,
    hoverTargetKey,
    hoverArm,
  );

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
            <RowBody ex={ex} t={t} globalUnit={globalUnit} />
          </View>
        </Sortable.Touchable>
      </View>

      <CornerBadge
        t={t}
        isEditing={isEditing}
        badgeStyle={badgeStyle}
        onTap={() => onDeleteTap(ex.workoutExerciseId)}
      />
    </Animated.View>
  );
});

// A whole superset group as ONE sortable block: shared card surface, SUPERSET
// header strip, hairline-inset member rows. It wobbles and drags as a single
// item; the corner badge unlinks the group, and while editing each member row
// grows an inline minus that deletes just that exercise. Memoized with the
// same stable-prop contract as ExerciseRow (`members` comes from the blocks
// memo, so timer ticks reuse the same array).
const SupersetBlockRow = React.memo(function SupersetBlockRow({
  blockKey,
  members,
  index,
  t,
  globalUnit,
  isEditing,
  hoverTargetKey,
  hoverArm,
  memberDrag,
  onTap,
  onLongPress,
  onDeleteTap,
  onUnlinkTap,
}: {
  blockKey: string;
  members: WorkoutExercise[];
  index: number;
  t: Theme;
  globalUnit: ReturnType<typeof useUnitPreference>["weightUnit"];
  isEditing: boolean;
  hoverTargetKey: SharedValue<null | string>;
  hoverArm: SharedValue<number>;
  memberDrag: MemberDragController;
  onTap: (ex: WorkoutExercise) => void;
  onLongPress: () => void;
  onDeleteTap: (id: string) => void;
  onUnlinkTap: (members: WorkoutExercise[]) => void;
}) {
  const { wobbleStyle, badgeStyle } = useJiggle(
    isEditing,
    index,
    blockKey,
    hoverTargetKey,
    hoverArm,
  );
  const memberIds = useMemo(
    () => members.map((m) => m.workoutExerciseId),
    [members],
  );

  return (
    <Animated.View
      style={wobbleStyle}
      onStartShouldSetResponder={() => isEditing}
    >
      <View style={styles.exerciseCardWrapper}>
        <View
          style={[
            styles.groupCard,
            {
              backgroundColor: t.surface,
              borderColor: t.border,
            },
          ]}
        >
          <Sortable.Touchable onLongPress={onLongPress}>
            <View style={styles.groupHeader}>
              <SupersetLinkIcon
                size={13}
                color={t.textMuted}
                strokeWidth={2.2}
              />
              <Text style={[styles.groupLabel, { color: t.textMuted }]}>
                SUPERSET
              </Text>
            </View>
          </Sortable.Touchable>

          {members.map((member, memberIndex) => (
            <GroupMemberRow
              key={member.workoutExerciseId}
              member={member}
              memberIndex={memberIndex}
              blockKey={blockKey}
              groupMemberIds={memberIds}
              t={t}
              globalUnit={globalUnit}
              isEditing={isEditing}
              drag={memberDrag}
              onTap={onTap}
              onLongPress={onLongPress}
              onDeleteTap={onDeleteTap}
            />
          ))}
        </View>
      </View>

      <CornerBadge
        t={t}
        isEditing={isEditing}
        badgeStyle={badgeStyle}
        onTap={() => onUnlinkTap(members)}
      />
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
  groupCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  groupMemberOuter: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupMemberTouchable: {
    flex: 1,
  },
  groupMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  // Inline per-member delete affordance shown only in edit mode. Plain
  // surface-toned circle (no glass: it sits inside the wobbling card, and a
  // glass view per member row is GPU cost with no protruding corner to earn
  // it).
  memberMinusHit: {
    paddingLeft: 12,
    paddingVertical: 8,
  },
  memberMinusCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  // Drag-out grip on the row's right edge in edit mode (the chevron hides to
  // make room). Generous padding for a full-height grab target.
  memberGripHit: {
    paddingLeft: 10,
    paddingRight: 16,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  // The floating member copy. Positioned in window coordinates from the
  // measured row; the subtle shadow reads as lift in both themes.
  memberGhost: {
    position: "absolute",
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
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
