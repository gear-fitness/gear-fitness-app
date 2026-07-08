import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { progressColor } from "./components/progressColor";
import { FloatingKeyboardDismiss } from "../../../components/FloatingKeyboardDismiss";
import { PlusLockOverlay } from "../../../components/PlusLockOverlay";

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
  // calorie header + progress bar). Expanding reveals the macro rings. Starts
  // collapsed so the screen opens compact.
  const [summaryCollapsed, setSummaryCollapsed] = useState(true);

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
      // Nothing to show (or fetch) behind the lock.
      if (isPlus) refresh();
    }, [refresh, isPlus]),
  );

  const goal = summary?.goal;
  const totals = summary?.totals;
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
          if (!decisive) {
            // Not a real swipe: settle back without changing the day.
            dayShift.value = withTiming(0, {
              duration: 180,
              easing: Easing.out(Easing.cubic),
            });
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
    [dayShift, swipeToDay],
  );

  const dayShiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dayShift.value }],
    // Subtle fade with displacement so the drag reads as "leaving the page".
    opacity: 1 - Math.min(Math.abs(dayShift.value) / (DAY_SWIPE_SLIDE * 3), 0.35),
  }));

  // The whole tracker is Plus-gated: a locked placeholder with a feature blurb
  // dimmed behind the lock overlay, tapping through to the upsell sheet.
  if (!isPlus) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
        <View style={styles.lockedWrap}>
          <View style={styles.lockedBlurb}>
            <Ionicons name="restaurant-outline" size={64} color={t.border} />
            <Text style={[styles.lockedTitle, { color: t.text }]}>
              Food journal
            </Text>
            <Text style={[styles.lockedSubtext, { color: t.secondary }]}>
              Log foods from the database or just type what you ate — AI works
              out the calories and macros and tracks them against your goals.
            </Text>
          </View>
          <PlusLockOverlay
            onPress={() =>
              navigation.navigate("PlusUpsell", {
                feature: "Track calories and macros with the food journal",
              })
            }
          />
        </View>
      </SafeAreaView>
    );
  }

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
          onPress={() => {
            // Fire on an actual day change; the back chevron is always enabled.
            Haptics.selectionAsync().catch(() => {});
            setSelectedDate(shiftDate(selectedDate, -1));
          }}
        >
          <Ionicons name="chevron-back" size={24} color={t.text} />
        </TouchableOpacity>
        {/* Tap the label to open a calendar dropdown and jump straight to a
            day (the chevrons still step one day at a time). */}
        <TouchableOpacity
          style={styles.dateLabelBtn}
          accessibilityLabel="Choose date"
          hitSlop={8}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setCalendarOpen(true);
          }}
        >
          <Text style={[styles.dateLabel, { color: t.text }]}>
            {dateLabel(selectedDate)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={t.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Next day"
          hitSlop={12}
          onPress={() => {
            // Future days are steppable too (logging ahead), matching the
            // calendar sheet, which has always allowed selecting them.
            Haptics.selectionAsync().catch(() => {});
            setSelectedDate(shiftDate(selectedDate, 1));
          }}
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
          accessibilityLabel={summaryCollapsed ? "Show macros" : "Hide macros"}
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
                { backgroundColor: progressColor(caloriePct) },
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
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

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

        <CameraLogMenu size={38} color={t.tint} />

        <GlassView style={styles.circleGlass}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={openAddFood}
            accessibilityLabel="Add food"
          >
            <MaterialCommunityIcons name="plus" size={22} color={t.tint} />
          </TouchableOpacity>
        </GlassView>
      </View>

      {/* The journal itself: typed lines AI-parse into logged foods; database
          picks from Add food appear as their own lines. */}
      <View style={styles.flex1}>
        <FoodJournal selectedDate={selectedDate} />
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
        visible={savedOpen}
        onClose={() => setSavedOpen(false)}
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
    gap: 4,
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
  // Locked (non-Plus) state: the blurb sits dimmed behind the lock overlay.
  lockedWrap: { flex: 1, position: "relative" },
  lockedBlurb: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  lockedTitle: { fontSize: 20, fontWeight: "600", marginTop: 16 },
  lockedSubtext: { fontSize: 14, marginTop: 8, textAlign: "center" },
});
