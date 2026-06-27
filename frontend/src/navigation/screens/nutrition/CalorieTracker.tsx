import React, { useCallback, useState } from "react";
import {
  Alert,
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
import { useThemeColors } from "../../../hooks/useThemeColors";
import { useTrackTab } from "../../../hooks/useTrackTab";
import { useNutrition } from "../../../context/NutritionContext";
import { FoodLogEntry } from "../../../api/types";
import { MacroRing } from "./components/MacroRing";
import { EditEntrySheet } from "./components/EditEntrySheet";
import { progressColor } from "./components/progressColor";

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateLabel(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = shiftDate(todayStr, -1);
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const round = (n: number | null | undefined) => Math.round(n ?? 0);

export function CalorieTracker() {
  useTrackTab("Nutrition");
  const t = useThemeColors();
  const navigation = useNavigation<any>();
  const {
    selectedDate,
    setSelectedDate,
    summary,
    categories,
    refresh,
    addCategory,
    removeCategory,
  } = useNutrition();

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);

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
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  const entries = summary?.entries ?? [];

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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Summary card */}
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
                <Text style={[styles.mealTitle, { color: t.text }]}>
                  {name}
                </Text>
                <View style={styles.mealHeaderRight}>
                  <Text style={[styles.mealCals, { color: t.secondary }]}>
                    {catCals} cal
                  </Text>
                  <TouchableOpacity
                    hitSlop={10}
                    onPress={() => handleDeleteCategory(name)}
                    style={styles.deleteBtn}
                    accessibilityLabel={`Delete ${name}`}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={t.secondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {catEntries.map((e) => (
                <MealEntryRow
                  key={e.entryId}
                  entry={e}
                  onPress={() => setEditingEntry(e)}
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

      {/* Floating "+" — only on this screen, floats above the tab bar. */}
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

      <EditEntrySheet
        entry={editingEntry}
        visible={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
      />
    </SafeAreaView>
  );
}

function MealEntryRow({
  entry,
  onPress,
}: {
  entry: FoodLogEntry;
  onPress: () => void;
}) {
  const t = useThemeColors();
  const { removeLog } = useNutrition();
  return (
    <TouchableOpacity
      style={[styles.entryRow, { borderTopColor: t.separator }]}
      onPress={onPress}
      accessibilityLabel={`Edit ${entry.description}`}
    >
      <View style={styles.entryInfo}>
        <Text style={[styles.entryName, { color: t.text }]} numberOfLines={1}>
          {entry.description}
        </Text>
        <Text style={[styles.entryMeta, { color: t.secondary }]}>
          {entry.quantity}{" "}
          {entry.unit === "GRAM" ? "g" : "serving"}
          {entry.quantity !== 1 && entry.unit === "SERVING" ? "s" : ""}
        </Text>
      </View>
      <Text style={[styles.entryCals, { color: t.text }]}>
        {round(entry.calories)}
      </Text>
      <TouchableOpacity
        accessibilityLabel="Remove entry"
        hitSlop={10}
        onPress={() => removeLog(entry.entryId)}
        style={styles.entryDelete}
      >
        <Ionicons name="close" size={18} color={t.secondary} />
      </TouchableOpacity>
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
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
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
  mealTitle: { fontSize: 16, fontWeight: "600" },
  mealCals: { fontSize: 14 },
  deleteBtn: { padding: 2 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    marginTop: 10,
  },
  entryInfo: { flex: 1, paddingRight: 8 },
  entryName: { fontSize: 15 },
  entryMeta: { fontSize: 12, marginTop: 2 },
  entryCals: { fontSize: 15, fontWeight: "600", marginRight: 12 },
  entryDelete: { padding: 2 },
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
