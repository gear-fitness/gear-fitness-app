import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { MenuView, MenuAction } from "@react-native-menu/menu";
import * as Haptics from "expo-haptics";
import PagerView from "react-native-pager-view";
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
import { SmartJournal } from "./components/SmartJournal";
import { progressColor } from "./components/progressColor";
import { FloatingKeyboardDismiss } from "../../../components/FloatingKeyboardDismiss";

// The two swipeable logging sections, in page order. Index <-> title.
const SECTION_TITLES = ["Manual entry", "Smart journal"];

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

  // Which logging section is showing: 0 = Manual entry, 1 = Smart journal.
  // Driven by the pager's onPageSelected; the dots/title read from it.
  const [activeSection, setActiveSection] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  // Delete a logged row (chosen from its hold-to-open native menu).
  const removeEntry = (entry: FoodLogEntry) => {
    removeLog(entry.entryId);
  };

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

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    setIsAddingCategory(false);
    setNewCategoryName("");
    if (!name) return;
    if (
      categories.some((c) => c.toLowerCase() === name.toLowerCase())
    ) {
      Alert.alert("Meal exists", `"${name}" is already a meal.`);
      return;
    }
    await addCategory(name);
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

  const startRename = (name: string) => {
    setRenamingCategory(name);
    setRenameText(name);
  };

  // Native dropdown actions for a category's ⋯ button.
  const categoryMenuActions = (name: string): MenuAction[] => [
    {
      id: "recurring",
      title: "Make recurring",
      state: isRecurring(name) ? "on" : "off",
      image: Platform.select({ ios: "repeat" }),
    },
    {
      id: "rename",
      title: "Rename",
      image: Platform.select({ ios: "pencil" }),
    },
    {
      id: "delete",
      title: "Delete",
      attributes: { destructive: true },
      image: Platform.select({ ios: "trash" }),
    },
  ];

  const onCategoryMenuAction = (name: string, actionId: string) => {
    if (actionId === "recurring") {
      setCategoryRecurring(name, !isRecurring(name));
    } else if (actionId === "rename") {
      startRename(name);
    } else if (actionId === "delete") {
      handleDeleteCategory(name);
    }
  };

  const submitRename = async () => {
    const next = renameText.trim();
    const old = renamingCategory;
    setRenamingCategory(null);
    setRenameText("");
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
    await renameCategory(old, next);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
      {/* Date navigation */}
      <View style={styles.dateRow}>
        <TouchableOpacity
          accessibilityLabel="Previous day"
          hitSlop={12}
          onPress={() => setSelectedDate(shiftDate(selectedDate, -1))}
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
          onPress={() => setSelectedDate(shiftDate(selectedDate, 1))}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isToday ? t.border : t.text}
          />
        </TouchableOpacity>
      </View>

      {/* Summary card — fixed above the swipeable logging sections */}
      <View style={styles.summaryWrap}>
        <View
          style={[
            styles.card,
            { backgroundColor: t.cardBg, borderColor: t.cardBorder },
          ]}
        >
          {/* Calories header + bar */}
          <View style={styles.calHeader}>
            <Text style={[styles.calTitle, { color: t.text }]}>
              Calories
            </Text>
            <Text style={[styles.calCount, { color: t.text }]}>
              {consumed} / {calorieGoal}
            </Text>
          </View>
          <View style={[styles.calTrack, { backgroundColor: t.trackBg }]}>
            {caloriePct > 0 && (
              <View
                style={[
                  styles.calFill,
                  {
                    width: `${caloriePct * 100}%`,
                    backgroundColor: progressColor(caloriePct),
                  },
                ]}
              />
            )}
          </View>

          {/* Macro rings */}
          <View style={styles.ringsRow}>
            <MacroRing
              label="Carbs"
              value={round(totals?.carbsG)}
              goal={goal?.carbsG ?? 0}
            />
            <MacroRing
              label="Protein"
              value={round(totals?.proteinG)}
              goal={goal?.proteinG ?? 0}
            />
            <MacroRing
              label="Fat"
              value={round(totals?.fatG)}
              goal={goal?.fatG ?? 0}
            />
          </View>

          <TouchableOpacity
            style={styles.goalLink}
            onPress={() => navigation.navigate("NutritionGoals")}
          >
            <Text style={[styles.goalLinkText, { color: t.secondary }]}>
              Edit goals
            </Text>
            <Ionicons name="chevron-forward" size={14} color={t.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section switcher: 2 dots (which side) + the active section's title.
          Sits directly under the progress card, above the swipeable pager. */}
      <View style={styles.switcher}>
        <View style={styles.dotsRow}>
          {[0, 1].map((i) => {
            const active = activeSection === i;
            return (
              <TouchableOpacity
                key={i}
                hitSlop={10}
                onPress={() => pagerRef.current?.setPage(i)}
                accessibilityLabel={`Show ${SECTION_TITLES[i]}`}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      width: active ? 18 : 7,
                      backgroundColor: active ? t.text : t.border,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.sectionTitle, { color: t.secondary }]}>
          {SECTION_TITLES[activeSection]}
        </Text>
      </View>

      {/* Swipeable logging sections: Manual entry <-> Smart journal. Both pages
          stay mounted, each scrolling independently. */}
      <PagerView
        ref={pagerRef}
        style={styles.flex1}
        initialPage={0}
        onPageSelected={(e) => {
          Keyboard.dismiss();
          setActiveSection(e.nativeEvent.position);
        }}
      >
        {/* Manual entry: the meal-category cards */}
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
            <View
              key={name}
              style={[
                styles.card,
                { backgroundColor: t.cardBg, borderColor: t.cardBorder },
              ]}
            >
              <View style={styles.mealHeader}>
                {renamingCategory === name ? (
                  <TextInput
                    autoFocus
                    value={renameText}
                    onChangeText={setRenameText}
                    onSubmitEditing={submitRename}
                    onBlur={submitRename}
                    returnKeyType="done"
                    placeholder="Meal name"
                    placeholderTextColor={t.secondary}
                    style={[styles.renameInput, { color: t.text }]}
                  />
                ) : (
                  <View style={styles.mealTitleRow}>
                    <Text style={[styles.mealTitle, { color: t.text }]}>
                      {name}
                    </Text>
                    {isRecurring(name) && (
                      <Ionicons name="repeat" size={14} color={t.secondary} />
                    )}
                  </View>
                )}
                <View style={styles.mealHeaderRight}>
                  <Text style={[styles.mealCals, { color: t.secondary }]}>
                    {catCals} cal
                  </Text>
                  <MenuView
                    title={name}
                    onPressAction={({ nativeEvent }) =>
                      onCategoryMenuAction(name, nativeEvent.event)
                    }
                    actions={categoryMenuActions(name)}
                  >
                    <View
                      style={styles.menuTrigger}
                      accessibilityLabel={`${name} options`}
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={18}
                        color={t.secondary}
                      />
                    </View>
                  </MenuView>
                </View>
              </View>

              {catEntries.map((e) => (
                <MealEntryRow
                  key={e.entryId}
                  entry={e}
                  subtitle={entrySubtitle(e, getEntryUnitMeta(e.entryId))}
                  onPress={() => setEditingEntry(e)}
                  onDelete={() => removeEntry(e)}
                />
              ))}

              <TouchableOpacity
                style={styles.addRow}
                onPress={() =>
                  navigation.navigate("AddFood", { category: name })
                }
              >
                <Ionicons name="add-circle-outline" size={20} color={t.tint} />
                <Text style={[styles.addText, { color: t.tint }]}>Log</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add a new meal category card */}
        {isAddingCategory ? (
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
              onSubmitEditing={handleCreateCategory}
              style={[styles.addCategoryInput, { color: t.text }]}
            />
            <View style={styles.addCategoryActions}>
              <TouchableOpacity
                onPress={() => {
                  setIsAddingCategory(false);
                  setNewCategoryName("");
                }}
              >
                <Text style={[styles.addCategoryCancel, { color: t.secondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateCategory}>
                <Text style={[styles.addCategoryDone, { color: t.tint }]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addMealBtn}
            onPress={() => {
              setIsAddingCategory(true);
              setNewCategoryName("");
            }}
          >
            <Ionicons name="add" size={20} color={t.secondary} />
            <Text style={[styles.addMealText, { color: t.secondary }]}>
              Add meal category
            </Text>
          </TouchableOpacity>
        )}
          </ScrollView>
        </View>

        {/* Smart journal: notes-app style section (future AI food entry) */}
        <View key="journal" style={styles.flex1} collapsable={false}>
          <SmartJournal selectedDate={selectedDate} />
        </View>
      </PagerView>

      {/* Floating "+" — manual-entry section only; floats above the tab bar.
          (Smart journal has its own "New note" button.) */}
      {activeSection === 0 && (
        <TouchableOpacity
          accessibilityLabel="Add food"
          activeOpacity={0.85}
          style={[styles.fab, { backgroundColor: t.accent }]}
          onPress={() =>
            navigation.navigate("AddFood", {
              category: displayedCategories[0] ?? "Breakfast",
            })
          }
        >
          <Ionicons name="add" size={32} color={t.accentText} />
        </TouchableOpacity>
      )}

      <EditEntrySheet
        entry={editingEntry}
        visible={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
      />

      <FloatingKeyboardDismiss />
    </SafeAreaView>
  );
}

function MealEntryRow({
  entry,
  subtitle,
  onPress,
  onDelete,
}: {
  entry: FoodLogEntry;
  subtitle: string;
  onPress: () => void;
  onDelete: () => void;
}) {
  const t = useThemeColors();
  return (
    <View style={styles.entryWrapper}>
      {/* Tap edits; hold opens a native menu to delete, buzzing as it opens. */}
      <MenuView
        title={entry.description}
        shouldOpenOnLongPress
        onOpenMenu={() =>
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => {},
          )
        }
        onPressAction={({ nativeEvent }) => {
          if (nativeEvent.event === "delete") onDelete();
        }}
        actions={[
          {
            id: "delete",
            title: "Delete",
            attributes: { destructive: true },
            image: Platform.select({ ios: "trash" }),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.entryRow,
            { backgroundColor: t.surface, borderColor: t.border },
          ]}
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityLabel={`Edit ${entry.description}`}
          accessibilityHint="Hold to delete"
        >
          <View style={styles.entryInfo}>
            <Text
              style={[styles.entryName, { color: t.text }]}
              numberOfLines={1}
            >
              {entry.description}
            </Text>
            <Text style={[styles.entryMeta, { color: t.secondary }]}>
              {subtitle}
            </Text>
          </View>
          <Text style={[styles.entryCals, { color: t.text }]}>
            {round(entry.calories)}
            <Text style={[styles.entryCalUnit, { color: t.secondary }]}>
              {" "}
              cal
            </Text>
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={t.secondary}
            style={styles.entryChevron}
          />
        </TouchableOpacity>
      </MenuView>
    </View>
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
  switcher: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
  },
  dotsRow: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  dot: { height: 7, borderRadius: 3.5 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calTitle: { fontSize: 18, fontWeight: "700" },
  calCount: { fontSize: 18, fontWeight: "700" },
  calTrack: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 12,
  },
  calFill: { height: 10, borderRadius: 5 },
  ringsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 22,
  },
  goalLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 14,
  },
  goalLinkText: { fontSize: 13 },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mealHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mealTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mealTitle: { fontSize: 16, fontWeight: "600" },
  mealCals: { fontSize: 14 },
  menuTrigger: { paddingVertical: 4, paddingHorizontal: 6 },
  renameInput: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    paddingVertical: 2,
    marginRight: 12,
  },
  entryWrapper: { borderRadius: 14, overflow: "hidden", marginTop: 10 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  entryInfo: { flex: 1, paddingRight: 8 },
  entryName: { fontSize: 16, fontWeight: "500" },
  entryMeta: { fontSize: 13, marginTop: 3 },
  entryCals: { fontSize: 16, fontWeight: "700" },
  entryCalUnit: { fontSize: 13, fontWeight: "500" },
  entryChevron: { marginLeft: 8 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  addText: { fontSize: 15, fontWeight: "500" },
  addMealBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  addMealText: { fontSize: 15 },
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
  fab: {
    position: "absolute",
    left: "50%",
    marginLeft: -28,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
