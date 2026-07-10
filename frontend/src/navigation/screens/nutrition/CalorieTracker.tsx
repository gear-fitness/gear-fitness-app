import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text } from "../../../components/Text";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { useTrackTab } from "../../../hooks/useTrackTab";
import { useTier } from "../../../hooks/useTier";
import { useNutrition } from "../../../context/NutritionContext";
import {
  getCurrentLocalDateString,
  getLocalDateStringFromEpoch,
  parseLocalDate,
} from "../../../utils/date";
import { MacroRing } from "./components/MacroRing";
import { macroColor } from "./components/macroColors";
import { CalendarSheet } from "./components/CalendarSheet";
import { FoodJournal } from "./components/FoodJournal";
import { CameraLogMenu } from "./components/CameraLogMenu";
import { SavedFoodsSheet } from "./components/SavedFoodsSheet";
import { PhotoEstimateSheet } from "./components/PhotoEstimateSheet";
import { useCameraFoodLog } from "./useCameraFoodLog";
import { progressColor } from "./components/progressColor";
import { FloatingKeyboardDismiss } from "../../../components/FloatingKeyboardDismiss";

// LayoutAnimation drives the smooth summary-card collapse. It's on by default
// on iOS; enable the experimental path on Android so the animation isn't
// dropped.
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Shift a YYYY-MM-DD date by whole days, staying in local time. Building the
// result from local calendar fields (not toISOString, which is UTC) keeps the
// day correct in every timezone.
function shiftDate(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return getLocalDateStringFromEpoch(d.getTime());
}

function dateLabel(dateStr: string): string {
  const todayStr = getCurrentLocalDateString();
  const yesterday = shiftDate(todayStr, -1);
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return parseLocalDate(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const round = (n: number | null | undefined) => Math.round(n ?? 0);

// Day-swipe tuning. Activation is deliberately horizontal (a vertical drift
// fails the gesture so the journal keeps scrolling), the content follows the
// finger heavily damped, and a swipe only commits on release — one day per
// gesture, no matter how far the finger travels.
const DAY_SWIPE_ACTIVATE = 24; // horizontal px before the pan claims the touch
const DAY_SWIPE_FAIL_Y = 16; // vertical px that hands the touch to scrolling
const DAY_SWIPE_TRIGGER = 72; // slow drag must travel this far to commit
const DAY_SWIPE_FLICK_DISTANCE = 36; // a flick may commit from here...
const DAY_SWIPE_FLICK_VELOCITY = 650; // ...if it's at least this fast (px/s)
const DAY_SWIPE_DAMPING = 0.35; // finger-follow resistance
const DAY_SWIPE_SLIDE = 56; // slide-out/in distance when a swipe commits

/**
 * The Nutrition tab: a per-day food journal (Plus-only). The summary card
 * tracks calories/macros against the user's goals; below it, one journal holds
 * everything logged that day — lines typed and AI-parsed, and foods picked
 * from the database via the "+" (Add food) button. Non-Plus users get the
 * locked screen with an upsell.
 */
export function CalorieTracker() {
  useTrackTab("Nutrition");
  const t = useThemeColors();
  const navigation = useNavigation() as any;
  const { atLeast } = useTier();
  const isPlus = atLeast("PLUS");
  const { selectedDate, setSelectedDate, summary, refresh } = useNutrition();

  // Whether the calorie summary card is collapsed to its compact form (just the
  // calorie header + progress bar). Collapsing hides the macro rings. Starts
  // expanded so the macros are visible on open.
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  // Calendar bottom sheet opened from the date label, for jumping straight to
  // a day instead of stepping the chevrons one day at a time.
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Favorites sheet (the user's reusable custom foods), opened from the
  // ribbon button in the controls row.
  const [savedOpen, setSavedOpen] = useState(false);

  const toggleSummary = () => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        220,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setSummaryCollapsed((v) => !v);
  };

  const glassAvailable = isLiquidGlassAvailable();

  useFocusEffect(
    useCallback(() => {
      // Refresh for every tier: non-Plus users can't log, but they can edit
      // goals, so the summary card must reflect goal changes on return.
      refresh();
    }, [refresh]),
  );

  // Setup is required before the tracker is usable: visiting this tab before
  // completing the calorie-calculator wizard (server-tracked via
  // goal.setupComplete) pushes the wizard full screen in forced mode, which
  // offers no way back, so completing it is the only path to the tracker.
  // Saving awaits the summary refresh before popping, so this screen
  // refocuses with setupComplete already true and doesn't re-push. The ref
  // de-dupes pushes within one focus (the effect re-runs when the summary
  // refreshes); the blur listener re-arms it for the next visit. The strict
  // `=== false` keeps old cached/legacy responses (undefined) from trapping
  // users who already completed setup.
  const needsSetup = summary?.goal?.setupComplete === false;
  const setupPushed = useRef(false);
  useEffect(
    () =>
      navigation.addListener("blur", () => {
        setupPushed.current = false;
      }),
    [navigation],
  );
  useFocusEffect(
    useCallback(() => {
      if (!setupPushed.current && needsSetup) {
        setupPushed.current = true;
        navigation.navigate("NutritionSetup", { forced: true });
      }
    }, [needsSetup, navigation]),
  );

  const goal = summary?.goal;
  const totals = summary?.totals;
  // Cutting flips the gauge colors: calories/carbs/fat are budgets (green
  // under, red spent), while protein stays a target (green when met).
  const reverseGauges = goal?.goalType === "CUT";
  const consumed = round(totals?.calories);
  const calorieGoal = goal?.calorieGoal ?? 0;
  const caloriePct = calorieGoal > 0 ? Math.min(consumed / calorieGoal, 1) : 0;
  // Fraction of the calorie bar filled, animated on the UI thread. The width
  // eases from 0 to caloriePct so the bar draws itself on entry.
  const barProgress = useSharedValue(0);

  // Replay the fill from empty on mount and whenever the day changes, matching
  // the rings' animateKey reset so the whole card reads as one motion.
  useEffect(() => {
    barProgress.value = 0;
    barProgress.value = withTiming(caloriePct, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    // Only the day drives the reset; caloriePct is read at replay time.
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ease to the new fill when the day's data refreshes without a day change.
  useEffect(() => {
    barProgress.value = withTiming(caloriePct, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [caloriePct]); // eslint-disable-line react-hooks/exhaustive-deps

  // Width goes 0% -> caloriePct%; the fill is invisible at 0 so no track guard
  // is needed. The color is the final progressColor (not animated).
  const barFillStyle = useAnimatedStyle(() => ({
    width: `${barProgress.value * 100}%`,
  }));

  const openAddFood = useCallback(() => {
    navigation.navigate("AddFood");
  }, [navigation]);

  // Camera logging flows (barcode scan / take photo / choose from library).
  // Sits behind the same Plus capture overlay as the rest of the controls.
  const cameraLog = useCameraFoodLog();

  // Non-Plus users see the tracker as a preview: the summary card stays live
  // (collapse toggle + Edit goals are free features), but anything that logs
  // or browses the journal opens the upsell sheet instead. Gating is split by
  // shape: discrete buttons wrap their handlers in `gate`, the controls row +
  // journal sit under a capture overlay, and the day-swipe pan branches in
  // its onEnd.
  const openUpsell = useCallback(() => {
    navigation.navigate("PlusUpsell", {
      feature: "Track calories and macros with the food journal",
    });
  }, [navigation]);

  // Non-Plus taps open the upsell instead of running the action. Incomplete
  // setup needs no gate here: the wizard renders in place of the tracker, so
  // these controls don't exist until setup is done.
  const gate = useCallback(
    (fn: () => void) => () => {
      if (!isPlus) {
        openUpsell();
      } else {
        fn();
      }
    },
    [isPlus, openUpsell],
  );

  // Horizontal swipe steps one day: left → next, right → previous. The
  // content follows the finger (damped, slightly fading), and on a decisive
  // release slides out toward the swipe and the new day slides in from the
  // other side. Committing only on release caps it at one day per gesture.
  const dayShift = useSharedValue(0);
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const swipeToDay = useCallback(
    (dir: 1 | -1) => {
      Haptics.selectionAsync().catch(() => {});
      setSelectedDate(shiftDate(selectedDateRef.current, dir));
    },
    [setSelectedDate],
  );

  const daySwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-DAY_SWIPE_ACTIVATE, DAY_SWIPE_ACTIVATE])
        .failOffsetY([-DAY_SWIPE_FAIL_Y, DAY_SWIPE_FAIL_Y])
        .onUpdate((e) => {
          dayShift.value = e.translationX * DAY_SWIPE_DAMPING;
        })
        .onEnd((e) => {
          const tx = e.translationX;
          const decisive =
            Math.abs(tx) >= DAY_SWIPE_TRIGGER ||
            (Math.abs(tx) >= DAY_SWIPE_FLICK_DISTANCE &&
              Math.abs(e.velocityX) >= DAY_SWIPE_FLICK_VELOCITY);
          if (!decisive || !isPlus) {
            // Settle back without changing the day: either the drag wasn't a
            // real swipe, or day browsing is locked (non-Plus). A decisive
            // locked swipe still counts as an interaction, so it opens the
            // upsell as the content springs home.
            dayShift.value = withTiming(0, {
              duration: 180,
              easing: Easing.out(Easing.cubic),
            });
            if (decisive && !isPlus) runOnJS(openUpsell)();
            return;
          }
          const dir = tx < 0 ? 1 : -1;
          runOnJS(swipeToDay)(dir);
          // Slide out with the swipe, teleport to the far side, ease back in —
          // reads as the new day sliding into place.
          dayShift.value = withSequence(
            withTiming(-dir * DAY_SWIPE_SLIDE, {
              duration: 110,
              easing: Easing.in(Easing.quad),
            }),
            withTiming(dir * DAY_SWIPE_SLIDE, { duration: 0 }),
            withTiming(0, {
              duration: 220,
              easing: Easing.out(Easing.cubic),
            }),
          );
        }),
    [dayShift, swipeToDay, isPlus, openUpsell],
  );

  const dayShiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dayShift.value }],
    // Subtle fade with displacement so the drag reads as "leaving the page".
    opacity:
      1 - Math.min(Math.abs(dayShift.value) / (DAY_SWIPE_SLIDE * 3), 0.35),
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
      {/* Everything that belongs to the shown day swipes as one piece; the
          sheets/modals below live outside so they never translate. */}
      <GestureDetector gesture={daySwipe}>
        <Reanimated.View style={[styles.flex1, dayShiftStyle]}>
          {/* Date navigation */}
          <View style={styles.dateRow}>
            <TouchableOpacity
              accessibilityLabel="Previous day"
              hitSlop={12}
              onPress={gate(() => {
                // Fire on an actual day change; the back chevron is always enabled.
                Haptics.selectionAsync().catch(() => {});
                setSelectedDate(shiftDate(selectedDate, -1));
              })}
            >
              <Ionicons name="chevron-back" size={24} color={t.text} />
            </TouchableOpacity>
            {/* Tap the label to open a calendar dropdown and jump straight to a
            day (the chevrons still step one day at a time). */}
            <TouchableOpacity
              style={styles.dateLabelBtn}
              accessibilityLabel="Choose date"
              hitSlop={8}
              onPress={gate(() => {
                Haptics.selectionAsync().catch(() => {});
                setCalendarOpen(true);
              })}
            >
              <Text style={[styles.dateLabel, { color: t.text }]}>
                {dateLabel(selectedDate)}
              </Text>
              {/* Absolutely positioned so the label centers on the text alone
              and the caret hangs off its right edge. */}
              <Ionicons
                name="chevron-down"
                size={14}
                color={t.secondary}
                style={styles.dateCaret}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Next day"
              hitSlop={12}
              onPress={gate(() => {
                // Future days are steppable too (logging ahead), matching the
                // calendar sheet, which has always allowed selecting them.
                Haptics.selectionAsync().catch(() => {});
                setSelectedDate(shiftDate(selectedDate, 1));
              })}
            >
              <Ionicons name="chevron-forward" size={24} color={t.text} />
            </TouchableOpacity>
          </View>

          {/* Summary chip — a compact glass card above the journal. Tap to
          collapse it down to just the calorie header + progress bar, or expand
          to reveal the macro rings. */}
          <View style={styles.summaryWrap}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={toggleSummary}
              accessibilityLabel={
                summaryCollapsed ? "Show macros" : "Hide macros"
              }
              style={[
                styles.summaryCard,
                {
                  backgroundColor: glassAvailable ? "transparent" : t.cardBg,
                  borderColor: glassAvailable ? "transparent" : t.cardBorder,
                },
              ]}
            >
              {glassAvailable && (
                <GlassView
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
                  glassEffectStyle="regular"
                />
              )}
              {/* Calories: label + count. Goals are edited via the Edit affordance
              on the expanded card, or from Settings. When the card is
              collapsed, compact macro rings sit on the right. */}
              <View style={styles.calHeader}>
                <View style={styles.calHeaderLeft}>
                  <Text
                    style={[styles.calCount, { color: t.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {consumed}
                    <Text style={[styles.calGoal, { color: t.secondary }]}>
                      {" / "}
                      {calorieGoal}
                    </Text>
                  </Text>
                  {!summaryCollapsed && (
                    <Text style={[styles.calLabel, { color: t.secondary }]}>
                      Calories
                    </Text>
                  )}
                </View>
                {summaryCollapsed ? (
                  <View style={styles.miniRingsRow}>
                    <MacroRing
                      label=""
                      value={round(totals?.carbsG)}
                      goal={goal?.carbsG ?? 0}
                      size={38}
                      stroke={4}
                      valueFontSize={11}
                      animateKey={selectedDate}
                      reverse={reverseGauges}
                    />
                    <MacroRing
                      label=""
                      value={round(totals?.proteinG)}
                      goal={goal?.proteinG ?? 0}
                      size={38}
                      stroke={4}
                      valueFontSize={11}
                      animateKey={selectedDate}
                    />
                    <MacroRing
                      label=""
                      value={round(totals?.fatG)}
                      goal={goal?.fatG ?? 0}
                      size={38}
                      stroke={4}
                      valueFontSize={11}
                      animateKey={selectedDate}
                      reverse={reverseGauges}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.editGoals}
                    hitSlop={10}
                    accessibilityLabel="Edit goals"
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      navigation.navigate("NutritionGoals");
                    }}
                  >
                    <Ionicons name="pencil" size={12} color={t.tint} />
                    <Text style={[styles.editGoalsText, { color: t.tint }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.calTrack, { backgroundColor: t.trackBg }]}>
                <Reanimated.View
                  style={[
                    styles.calFill,
                    barFillStyle,
                    {
                      backgroundColor: progressColor(caloriePct, reverseGauges),
                    },
                  ]}
                />
              </View>

              {/* Macro rings — hidden while the card is collapsed. Centers show
              consumed/goal; labels wear each macro's identity color. */}
              {!summaryCollapsed && (
                <View style={styles.ringsRow}>
                  <MacroRing
                    label="Carbs"
                    labelColor={macroColor("carbs", t.isDark)}
                    labelBold
                    value={round(totals?.carbsG)}
                    goal={goal?.carbsG ?? 0}
                    size={60}
                    stroke={6}
                    valueFontSize={11}
                    showGoal
                    animateKey={selectedDate}
                    reverse={reverseGauges}
                  />
                  <MacroRing
                    label="Protein"
                    labelColor={macroColor("protein", t.isDark)}
                    labelBold
                    value={round(totals?.proteinG)}
                    goal={goal?.proteinG ?? 0}
                    size={60}
                    stroke={6}
                    valueFontSize={11}
                    showGoal
                    animateKey={selectedDate}
                  />
                  <MacroRing
                    label="Fat"
                    labelColor={macroColor("fat", t.isDark)}
                    labelBold
                    value={round(totals?.fatG)}
                    goal={goal?.fatG ?? 0}
                    size={60}
                    stroke={6}
                    valueFontSize={11}
                    showGoal
                    animateKey={selectedDate}
                    reverse={reverseGauges}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Everything below the summary card is Plus-only, grouped under one
          wrapper so a single capture overlay gates it all (including the
          camera menu's and journal's internal controls, which would otherwise
          each need their own tier checks). */}
          <View style={styles.flex1}>
            <View
              style={styles.flex1}
              // Hide the gated controls from screen readers while locked, so
              // VoiceOver lands on the overlay button instead of activating the
              // controls underneath (which never see touches but do get a11y
              // activations).
              accessibilityElementsHidden={!isPlus}
              importantForAccessibility={
                !isPlus ? "no-hide-descendants" : "auto"
              }
            >
              {/* Controls row, centered between the summary card and the journal:
              favorites (reusable custom foods), a camera menu (scan / photo /
              library), and a "+" that opens the Add food database search. */}
              <View style={styles.controlsRow}>
                <GlassView style={styles.circleGlass}>
                  <TouchableOpacity
                    style={styles.circleBtn}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setSavedOpen(true);
                    }}
                    accessibilityLabel="Favorites"
                  >
                    <Ionicons name="bookmark" size={19} color={t.tint} />
                  </TouchableOpacity>
                </GlassView>

                <CameraLogMenu
                  size={38}
                  color={t.tint}
                  onScanBarcode={cameraLog.scanBarcode}
                  onTakePhoto={cameraLog.takePhoto}
                  onChooseFromLibrary={cameraLog.chooseFromLibrary}
                />

                <GlassView style={styles.circleGlass}>
                  <TouchableOpacity
                    style={styles.circleBtn}
                    onPress={openAddFood}
                    accessibilityLabel="Add food"
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={22}
                      color={t.tint}
                    />
                  </TouchableOpacity>
                </GlassView>
              </View>

              {/* The journal itself: typed lines AI-parse into logged foods;
              database picks from Add food appear as their own lines. */}
              <View style={styles.flex1}>
                <FoodJournal selectedDate={selectedDate} />
              </View>
            </View>

            {/* Locked (non-Plus): a transparent overlay grabs every touch
            headed for the controls or journal before it reaches them, opening
            the upsell sheet instead. `onStartShouldSetResponder` claims the
            gesture on touch-down so nothing beneath ever activates; refusing
            termination keeps the responder until release, so the sheet
            reliably opens (reading as a tap). */}
            {!isPlus && (
              <View
                style={StyleSheet.absoluteFill}
                accessibilityRole="button"
                accessibilityLabel="Unlock the food journal with Plus"
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                onResponderRelease={openUpsell}
              />
            )}
          </View>
        </Reanimated.View>
      </GestureDetector>

      {/* Calendar bottom sheet — days with entries marked, future days
          selectable for logging ahead. Day taps update the screen live;
          Done dismisses. */}
      <CalendarSheet
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <SavedFoodsSheet
        visible={savedOpen || cameraLog.customFoodOpen}
        onClose={() => {
          setSavedOpen(false);
          cameraLog.closeCustomFood();
        }}
        // Barcode-miss fallback: land on the create form prefilled with
        // whatever product name the lookup returned.
        initialMode={cameraLog.customFoodOpen ? "create" : undefined}
        initialDescription={cameraLog.customFoodPrefill ?? undefined}
      />

      <PhotoEstimateSheet
        visible={cameraLog.photoVisible}
        uri={cameraLog.photoUri}
        onClose={cameraLog.closePhoto}
      />

      <FloatingKeyboardDismiss />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  dateLabel: { fontSize: 17, fontWeight: "600" },
  dateLabelBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateCaret: {
    position: "absolute",
    left: "100%",
    marginLeft: 4,
  },
  flex1: { flex: 1 },
  summaryWrap: { paddingHorizontal: 16 },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  circleGlass: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
  },
  circleBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  // Compact glass summary chip.
  summaryCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calHeaderLeft: {
    // Bottom-aligned (not baseline): the "Calories" word should sit flush with
    // the bottom of the larger number. The small marginBottom on the label
    // compensates for its shallower descender box so the glyph bottoms line up
    // optically; may need a point of on-device tuning.
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 1,
  },
  calLabel: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  calCount: { fontSize: 20, fontWeight: "700" },
  calGoal: { fontSize: 20, fontWeight: "700" },
  calTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 10,
  },
  calFill: { height: 6, borderRadius: 3 },
  ringsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 14,
  },
  // Sits in the header's top-right corner while the card is expanded (the
  // collapsed card shows the mini rings there instead).
  editGoals: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editGoalsText: { fontSize: 13, fontWeight: "600" },
  miniRingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
});
