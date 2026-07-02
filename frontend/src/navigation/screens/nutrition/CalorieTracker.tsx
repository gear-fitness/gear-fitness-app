import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import PagerView from "react-native-pager-view";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { useTrackTab } from "../../../hooks/useTrackTab";
import { useNutrition } from "../../../context/NutritionContext";
import { FoodLogEntry } from "../../../api/types";
import { formatQuantity } from "../../../utils/nutritionUnits";
import {
  getCurrentLocalDateString,
  getLocalDateStringFromEpoch,
  parseLocalDate,
} from "../../../utils/date";
import { MacroRing } from "./components/MacroRing";
import { EditEntrySheet } from "./components/EditEntrySheet";
import { MealSwipeLeftAction } from "./components/MealMenuButton";
import { SmartJournal } from "./components/SmartJournal";
import { CameraLogMenu } from "./components/CameraLogMenu";
import { AddLogMenu } from "./components/AddLogMenu";
import { progressColor } from "./components/progressColor";
import { FloatingKeyboardDismiss } from "../../../components/FloatingKeyboardDismiss";

// LayoutAnimation drives the smooth meal-card collapse. It's on by default on
// iOS; enable the experimental path on Android so the animation isn't dropped.
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

// Subtitle for a logged row: the exact quantity + unit. Prefers the entry's
// client-side display unit (e.g. "4 oz", "1 cup"); falls back to its stored
// serving/gram amount.
function entrySubtitle(
  entry: FoodLogEntry,
  meta: ReturnType<ReturnType<typeof useNutrition>["getEntryUnitMeta"]>,
): string {
  if (meta) return formatQuantity(meta.quantity, meta.unitKey);
  const n = entry.quantity;
  if (entry.unit === "GRAM") return `${n} g`;
  return `${n} ${n === 1 ? "serving" : "servings"}`;
}

export function CalorieTracker() {
  useTrackTab("Nutrition");
  const t = useThemeColors();
  const navigation = useNavigation<any>();
  const {
    selectedDate,
    setSelectedDate,
    summary,
    categories,
    isRecurring,
    refresh,
    removeLog,
    getEntryUnitMeta,
    addCategory,
    renameCategory,
    removeCategory,
    setCategoryRecurring,
  } = useNutrition();

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  // Which logging section is showing: 0 = Manual, 1 = Smart journal. Kept in
  // sync with the pager below (swipe or tap the toggle to switch).
  const [activeSection, setActiveSection] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  // Names of the meal cards the user has expanded. Everything starts collapsed;
  // expanding reveals a card's entries behind a smooth height change.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Whether the calorie summary card is collapsed to its compact form (just the
  // calorie header + progress bar). Expanding reveals the macro rings. Starts
  // collapsed so the screen opens compact.
  const [summaryCollapsed, setSummaryCollapsed] = useState(true);

  const changeSection = (index: number) => {
    if (index === activeSection) return;
    Keyboard.dismiss();
    Haptics.selectionAsync().catch(() => {});
    pagerRef.current?.setPage(index);
  };

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

  const toggleExpanded = (name: string) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        220,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const glassAvailable = isLiquidGlassAvailable();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const goal = summary?.goal;
  const totals = summary?.totals;
  const consumed = round(totals?.calories);
  const calorieGoal = goal?.calorieGoal ?? 0;
  const caloriePct = calorieGoal > 0 ? Math.min(consumed / calorieGoal, 1) : 0;
  const isToday = selectedDate === getCurrentLocalDateString();

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

  // AI Smart Journal foods live only in that tab — keep them out of the manual
  // meal cards (they still count toward the day's totals, which come from
  // summary.totals, computed server-side over every entry).
  const entries = (summary?.entries ?? []).filter(
    (e) => !e.sourceType?.startsWith("AI"),
  );

  // An entry's visual bucket: its label, or "Uncategorized" when it has none.
  // Without this fallback, entries with a null/empty category (e.g. legacy rows
  // from the old meal_category table) are summed into the day's totals by the
  // backend but never rendered under any card — showing phantom calories with
  // "nothing logged". Bucketing them keeps the displayed cards reconciled with
  // the total and lets the user delete them.
  const bucketOf = (e: FoodLogEntry): string =>
    e.category && e.category.trim() ? e.category : "Uncategorized";

  const entriesForCategory = (name: string): FoodLogEntry[] =>
    entries.filter((e) => bucketOf(e) === name);

  // Cards to show: the user's category list, plus any bucket present in the
  // day's entries that isn't already in the list (so logged food is never
  // hidden from the totals).
  const extraCategories = Array.from(
    new Set(entries.map(bucketOf).filter((c) => !categories.includes(c))),
  );
  const displayedCategories = [...categories, ...extraCategories];

  const openAddFood = useCallback(() => {
    navigation.navigate("AddFood", {
      category: displayedCategories[0] ?? "Breakfast",
    });
  }, [navigation, displayedCategories]);

  const createCategory = async (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (
      categories.some((c) => c.toLowerCase() === name.toLowerCase())
    ) {
      Alert.alert("Meal exists", `"${name}" is already a meal.`);
      return;
    }
    await addCategory(name);
  };

  // "Add meal category" from the "+" menu. iOS gets a native text prompt so the
  // whole flow lives at the menu; Android (no Alert.prompt) falls back to the
  // inline input card rendered under the meal list.
  const promptAddCategory = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "New meal category",
        "Name this meal (e.g. Meal Prep)",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add", onPress: (text?: string) => createCategory(text ?? "") },
        ],
        "plain-text",
      );
      return;
    }
    setNewCategoryName("");
    setIsAddingCategory(true);
  };

  const handleInlineCreate = async () => {
    setIsAddingCategory(false);
    const raw = newCategoryName;
    setNewCategoryName("");
    await createCategory(raw);
  };

  const handleDeleteCategory = (name: string) => {
    const count = entriesForCategory(name).length;
    const msg =
      count > 0
        ? `Delete "${name}"? The ${count} item${count === 1 ? "" : "s"} logged under it today will also be removed.`
        : `Delete "${name}"?`;
    Alert.alert("Delete meal", msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeCategory(name),
      },
    ]);
  };

  const renameCategoryTo = async (old: string, raw: string) => {
    const next = raw.trim();
    if (!old || !next || next === old) return;
    if (
      categories.some(
        (c) =>
          c.toLowerCase() === next.toLowerCase() &&
          c.toLowerCase() !== old.toLowerCase(),
      )
    ) {
      Alert.alert("Meal exists", `"${next}" is already a meal.`);
      return;
    }
    // Carry the expanded flag across the rename. `expanded` is keyed by
    // category name, so without this the renamed card loses its state and
    // springs shut (or the stale old-name entry lingers).
    setExpanded((prev) => {
      if (!prev.has(old)) return prev;
      const nextSet = new Set(prev);
      nextSet.delete(old);
      nextSet.add(next);
      return nextSet;
    });
    await renameCategory(old, next);
  };

  // Rename from a meal card's menu. iOS gets a native text prompt pre-filled
  // with the current name; Android (no Alert.prompt) falls back to the inline
  // TextInput in the card header.
  const startRename = (name: string) => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Rename meal",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (text?: string) => renameCategoryTo(name, text ?? ""),
          },
        ],
        "plain-text",
        name,
      );
      return;
    }
    setRenamingCategory(name);
    setRenameText(name);
  };

  const submitInlineRename = async () => {
    const old = renamingCategory;
    const raw = renameText;
    setRenamingCategory(null);
    setRenameText("");
    if (!old) return;
    await renameCategoryTo(old, raw);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
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
        <Text style={[styles.dateLabel, { color: t.text }]}>
          {dateLabel(selectedDate)}
        </Text>
        <TouchableOpacity
          accessibilityLabel="Next day"
          hitSlop={12}
          disabled={isToday}
          onPress={() => {
            // Disabled on today, so this only fires when the day actually moves.
            Haptics.selectionAsync().catch(() => {});
            setSelectedDate(shiftDate(selectedDate, 1));
          }}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isToday ? t.border : t.text}
          />
        </TouchableOpacity>
      </View>

      {/* Summary chip — a compact glass card above the logging sections. Tap to
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
          {/* Calories: label + count. Goals are edited from Settings. When the
              card is collapsed, compact macro rings sit on the right. */}
          <View style={styles.calHeader}>
            <View style={styles.calHeaderLeft}>
              {!summaryCollapsed && (
                <Text style={[styles.calLabel, { color: t.secondary }]}>
                  Calories
                </Text>
              )}
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
            </View>
            {summaryCollapsed && (
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

          {/* Compact macro rings — hidden while the card is collapsed. */}
          {!summaryCollapsed && (
            <View style={styles.ringsRow}>
              <MacroRing
                label="Carbs"
                value={round(totals?.carbsG)}
                goal={goal?.carbsG ?? 0}
                size={54}
                stroke={6}
                valueFontSize={15}
                animateKey={selectedDate}
              />
              <MacroRing
                label="Protein"
                value={round(totals?.proteinG)}
                goal={goal?.proteinG ?? 0}
                size={54}
                stroke={6}
                valueFontSize={15}
                animateKey={selectedDate}
              />
              <MacroRing
                label="Fat"
                value={round(totals?.fatG)}
                goal={goal?.fatG ?? 0}
                size={54}
                stroke={6}
                valueFontSize={15}
                animateKey={selectedDate}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Controls row, centered between the summary card and the meal cards: a
          Manual <-> Smart journal toggle, a camera menu (scan / photo / library),
          and a "+" that opens the Add Food screen. */}
      <View style={styles.controlsRow}>
        <GlassView style={styles.circleGlass}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => changeSection(activeSection === 0 ? 1 : 0)}
            accessibilityLabel={
              activeSection === 1
                ? "Switch to manual logging"
                : "Switch to smart journal"
            }
          >
            {activeSection === 1 ? (
              <Ionicons name="restaurant" size={18} color={t.tint} />
            ) : (
              <MaterialCommunityIcons
                name="creation"
                size={19}
                color={t.tint}
              />
            )}
          </TouchableOpacity>
        </GlassView>

        <CameraLogMenu size={38} color={t.tint} />

        <AddLogMenu
          size={38}
          color={t.tint}
          onAddFood={openAddFood}
          onAddCategory={promptAddCategory}
        />
      </View>

      {/* Swipeable logging sections: Manual <-> Smart journal. Both pages stay
          mounted; swipe or tap the toggle to switch (kept in sync via
          onPageSelected). */}
      <PagerView
        ref={pagerRef}
        style={styles.flex1}
        initialPage={0}
        onPageSelected={(e) => setActiveSection(e.nativeEvent.position)}
      >
        <View key="manual" style={styles.flex1} collapsable={false}>
          <ScrollView
            contentContainerStyle={styles.pageScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Meal category cards */}
            {displayedCategories.map((name) => {
              const catEntries = entriesForCategory(name);
              const catCals = catEntries.reduce(
                (sum, e) => sum + round(e.calories),
                0,
              );
              return (
                <MealCard
                  key={name}
                  name={name}
                  entries={catEntries}
                  cals={catCals}
                  collapsed={!expanded.has(name)}
                  recurring={isRecurring(name)}
                  renaming={renamingCategory === name}
                  renameText={renameText}
                  onRenameChange={setRenameText}
                  onRenameSubmit={submitInlineRename}
                  onToggle={() => toggleExpanded(name)}
                  onToggleRecurring={() =>
                    setCategoryRecurring(name, !isRecurring(name))
                  }
                  onRename={() => startRename(name)}
                  onDelete={() => handleDeleteCategory(name)}
                  onAdd={() =>
                    navigation.navigate("AddFood", { category: name })
                  }
                  onEntryPress={(e) => setEditingEntry(e)}
                  getSubtitle={(e) =>
                    entrySubtitle(e, getEntryUnitMeta(e.entryId))
                  }
                />
              );
            })}

            {/* New meal category input — Android fallback for the "+" menu's
                "Add meal category" option (iOS uses a native Alert.prompt). */}
            {isAddingCategory && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: t.cardBg, borderColor: t.cardBorder },
                ]}
              >
                <TextInput
                  autoFocus
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Meal name (e.g. Meal Prep)"
                  placeholderTextColor={t.secondary}
                  returnKeyType="done"
                  onSubmitEditing={handleInlineCreate}
                  style={[styles.addCategoryInput, { color: t.text }]}
                />
                <View style={styles.addCategoryActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                    }}
                  >
                    <Text
                      style={[styles.addCategoryCancel, { color: t.secondary }]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleInlineCreate}>
                    <Text style={[styles.addCategoryDone, { color: t.tint }]}>
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
        <View key="journal" style={styles.flex1} collapsable={false}>
          <SmartJournal selectedDate={selectedDate} />
        </View>
      </PagerView>

      <EditEntrySheet
        entry={editingEntry}
        visible={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
        onDelete={() => {
          if (editingEntry) removeLog(editingEntry.entryId);
          setEditingEntry(null);
        }}
      />

      <FloatingKeyboardDismiss />
    </SafeAreaView>
  );
}

// A disclosure chevron that spins between 0 (collapsed, pointing right) and 90
// degrees (expanded, pointing down) with a small spring, matching the card's
// collapse animation.
function DisclosureChevron({
  open,
  color,
}: {
  open: boolean;
  color: string;
}) {
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 220,
    }).start();
  }, [open, anim]);

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="chevron-forward" size={16} color={color} />
    </Animated.View>
  );
}

// A single meal category: a collapsible card whose header (name + total cals)
// is always visible and whose entries reveal on tap. Keeps its header compact
// and leans on negative space instead of nested bordered boxes.
function MealCard({
  name,
  entries,
  cals,
  collapsed,
  recurring,
  renaming,
  renameText,
  onRenameChange,
  onRenameSubmit,
  onToggle,
  onToggleRecurring,
  onRename,
  onDelete,
  onAdd,
  onEntryPress,
  getSubtitle,
}: {
  name: string;
  entries: FoodLogEntry[];
  cals: number;
  collapsed: boolean;
  recurring: boolean;
  renaming: boolean;
  renameText: string;
  onRenameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onToggle: () => void;
  onToggleRecurring: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAdd: () => void;
  onEntryPress: (entry: FoodLogEntry) => void;
  getSubtitle: (entry: FoodLogEntry) => string;
}) {
  const t = useThemeColors();
  const glassAvailable = isLiquidGlassAvailable();
  const swipeRef = useRef<SwipeableMethods>(null);
  const swipeOpen = useRef(false);
  // Mirrors the row's open state in React state (the swipeOpen ref stays for
  // tap guarding). Drives the dynamic leftward-drag threshold below so an open
  // row can be swiped closed while a closed row lets the pager take the swipe.
  const [menuOpen, setMenuOpen] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeSwipe = () => swipeRef.current?.close();

  // Clear any pending "swipe settled" timer on unmount.
  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  // When the row is open, a tap anywhere on the card should just close it rather
  // than collapse the card or open a food entry — matches iOS swipe behavior and
  // prevents a swipe from accidentally registering as a tap on release.
  const guardTap = (action: () => void) => () => {
    if (swipeOpen.current) {
      closeSwipe();
      return;
    }
    action();
  };

  return (
    // Swipe the card right to reveal a pencil menu on the left; tap it for the
    // category actions. Disabled while renaming inline.
    <Swipeable
      ref={swipeRef}
      friction={2}
      leftThreshold={36}
      overshootLeft={false}
      enabled={!renaming}
      // Only left actions exist here (revealed by dragging right). Internally the
      // pan gesture is configured as activeOffsetX([-dragOffsetFromRightEdge,
      // dragOffsetFromLeftEdge]), so dragOffsetFromRightEdge sets the leftward
      // activation threshold. We flip it based on the row's open state:
      //   - Closed: a huge threshold pushes leftward activation to infinity, so
      //     leftward drags never claim the gesture and fall through to the
      //     PagerView (Manual <-> Smart journal). Rightward drags still open the
      //     menu at the default 10pt threshold.
      //   - Open: the default 10pt threshold lets a leftward swipe close the
      //     row (iOS-standard), so paging is intentionally suppressed on that
      //     row until it's closed. A tap still closes it too (guardTap ->
      //     close()), which is a separate gesture and stays unaffected.
      dragOffsetFromRightEdge={menuOpen ? 10 : Number.MAX_SAFE_INTEGER}
      containerStyle={styles.mealSwipe}
      // Mark the row "busy" the moment a swipe drag starts (not just once open),
      // so a tap on release is swallowed by guardTap instead of collapsing the
      // card or opening a food entry.
      onSwipeableOpenStartDrag={() => {
        if (settleTimer.current) clearTimeout(settleTimer.current);
        swipeOpen.current = true;
        setMenuOpen(true);
      }}
      onSwipeableWillOpen={() => {
        if (settleTimer.current) clearTimeout(settleTimer.current);
        swipeOpen.current = true;
        setMenuOpen(true);
      }}
      onSwipeableWillClose={() => {
        // Restore the closed-row threshold right away so the pager can take
        // leftward swipes again once the row settles shut.
        setMenuOpen(false);
        // Keep the row marked "busy" for a beat after it starts closing so the
        // swipe's release (or the tap that dismissed the menu/rename prompt)
        // isn't caught by the header's onPress and mistaken for a collapse or
        // entry tap.
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(() => {
          swipeOpen.current = false;
          settleTimer.current = null;
        }, 400);
      }}
      renderLeftActions={() => (
        <MealSwipeLeftAction
          name={name}
          recurring={recurring}
          color={t.tint}
          onToggleRecurring={onToggleRecurring}
          onRename={onRename}
          onDelete={onDelete}
          onSelected={closeSwipe}
        />
      )}
    >
      <View
        style={[
          styles.mealCard,
          {
            backgroundColor: glassAvailable ? "transparent" : t.cardBg,
            borderColor: glassAvailable ? "transparent" : t.cardBorder,
          },
        ]}
      >
        {glassAvailable && (
          <GlassView
            style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
            glassEffectStyle="regular"
          />
        )}
        {/* Header — tap to expand/collapse (disabled while renaming inline). */}
        <TouchableOpacity
          style={styles.mealHeader}
          activeOpacity={0.7}
          disabled={renaming}
          onPress={guardTap(onToggle)}
          accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${name}`}
        >
          <View style={styles.mealHeaderLeft}>
            <DisclosureChevron open={!collapsed} color={t.secondary} />
            {renaming ? (
              <TextInput
                autoFocus
                value={renameText}
                onChangeText={onRenameChange}
                onSubmitEditing={onRenameSubmit}
                onBlur={onRenameSubmit}
                returnKeyType="done"
                placeholder="Meal name"
                placeholderTextColor={t.secondary}
                style={[styles.renameInput, { color: t.text }]}
              />
            ) : (
              <View style={styles.mealTitleRow}>
                <Text style={[styles.mealTitle, { color: t.text }]}>{name}</Text>
                {recurring && (
                  <Ionicons name="repeat" size={14} color={t.secondary} />
                )}
              </View>
            )}
          </View>
          <View style={styles.mealHeaderRight}>
            {/* Matches the entry rows' calorie styling: bold number + a lighter
                " cal" suffix. */}
            <Text style={[styles.entryCals, { color: t.text }]}>
              {cals}
              <Text style={[styles.entryCalUnit, { color: t.secondary }]}>
                {" cal"}
              </Text>
            </Text>
          </View>
        </TouchableOpacity>

        {/* Body — entries + a lightweight add row, only while expanded. */}
        {!collapsed && (
          <View style={styles.mealBody}>
            {entries.map((e) => (
              <MealEntryRow
                key={e.entryId}
                entry={e}
                subtitle={getSubtitle(e)}
                onPress={guardTap(() => onEntryPress(e))}
              />
            ))}
            <TouchableOpacity
              style={[styles.addRow, { borderTopColor: t.separator }]}
              onPress={guardTap(onAdd)}
            >
              <MaterialCommunityIcons name="plus" size={18} color={t.tint} />
              <Text style={[styles.addText, { color: t.tint }]}>Add food</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Swipeable>
  );
}

// A flattened entry row: no bordered box, just a hairline separator and open
// space. Tapping it opens the edit sheet (which is also where a food is
// deleted). No trailing chevron — the whole row is the affordance.
function MealEntryRow({
  entry,
  subtitle,
  onPress,
}: {
  entry: FoodLogEntry;
  subtitle: string;
  onPress: () => void;
}) {
  const t = useThemeColors();

  return (
    <TouchableOpacity
      style={[styles.entryRow, { borderTopColor: t.separator }]}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityLabel={`Edit ${entry.description}`}
    >
      <View style={styles.entryInfo}>
        <Text style={[styles.entryName, { color: t.text }]} numberOfLines={1}>
          {entry.description}
        </Text>
        <Text style={[styles.entryMeta, { color: t.secondary }]}>
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.entryCals, { color: t.text }]}>
        {round(entry.calories)}
        <Text style={[styles.entryCalUnit, { color: t.secondary }]}> cal</Text>
      </Text>
    </TouchableOpacity>
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
  flex1: { flex: 1 },
  summaryWrap: { paddingHorizontal: 16 },
  pageScroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 },
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
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
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
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexShrink: 1,
  },
  calLabel: { fontSize: 13, fontWeight: "600" },
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
  miniRingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  // Spacing between cards lives on the swipe container so the card itself keeps
  // its rounded shape as it slides over the revealed menu.
  mealSwipe: { marginBottom: 12 },
  // Meal card: no inner padding so the header fills the tappable width; rows
  // manage their own horizontal padding.
  mealCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  mealHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  mealHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealBody: { paddingBottom: 6 },
  mealTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mealTitle: { fontSize: 16, fontWeight: "600" },
  renameInput: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    paddingVertical: 2,
    marginRight: 12,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  entryInfo: { flex: 1, paddingRight: 12 },
  entryName: { fontSize: 16, fontWeight: "500" },
  entryMeta: { fontSize: 13, marginTop: 3 },
  entryCals: { fontSize: 16, fontWeight: "700" },
  entryCalUnit: { fontSize: 13, fontWeight: "500" },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    gap: 4,
  },
  addText: { fontSize: 15, fontWeight: "500" },
  addCategoryInput: {
    fontSize: 16,
    paddingVertical: 4,
  },
  addCategoryActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: 12,
  },
  addCategoryCancel: { fontSize: 15 },
  addCategoryDone: { fontSize: 15, fontWeight: "600" },
});
