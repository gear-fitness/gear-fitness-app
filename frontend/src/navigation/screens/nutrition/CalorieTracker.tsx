import React, { useCallback, useRef, useState } from "react";
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
import { FoodLogEntry, MealCategory } from "../../../api/types";
import { MacroBar } from "./components/MacroBar";

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
    refresh,
    addCategory,
    removeCategory,
  } = useNutrition();

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const addInputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const goal = summary?.goal;
  const totals = summary?.totals;
  const consumed = round(totals?.calories);
  const calorieGoal = goal?.calorieGoal ?? 0;
  const remaining = calorieGoal - consumed;
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  const entriesForCategory = (categoryId: string): FoodLogEntry[] =>
    summary?.entries.filter((e) => e.categoryId === categoryId) ?? [];

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setIsAddingCategory(false);
      setNewCategoryName("");
      return;
    }
    setIsAddingCategory(false);
    setNewCategoryName("");
    try {
      await addCategory(name);
    } catch {
      Alert.alert("Could not create meal", "A meal with that name may already exist.");
    }
  };

  const handleDeleteCategory = (category: MealCategory) => {
    const count = entriesForCategory(category.categoryId).length;
    const msg =
      count > 0
        ? `Delete "${category.name}"? The ${count} item${count === 1 ? "" : "s"} logged under it will also be removed.`
        : `Delete "${category.name}"?`;
    Alert.alert("Delete meal", msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeCategory(category.categoryId),
      },
    ]);
  };

  const categories: MealCategory[] = summary?.categories ?? [];

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
          <View style={styles.remainingRow}>
            <View style={styles.remainingBlock}>
              <Text style={[styles.bigNumber, { color: t.text }]}>
                {remaining}
              </Text>
              <Text style={[styles.caption, { color: t.secondary }]}>
                {remaining >= 0 ? "Calories remaining" : "Calories over"}
              </Text>
            </View>
            <View style={styles.calMath}>
              <Text style={[styles.calMathText, { color: t.secondary }]}>
                {calorieGoal} goal
              </Text>
              <Text style={[styles.calMathText, { color: t.secondary }]}>
                − {consumed} food
              </Text>
            </View>
          </View>

          <View style={styles.macros}>
            <MacroBar
              label="Protein"
              value={round(totals?.proteinG)}
              goal={goal?.proteinG ?? 0}
              color="#34C759"
            />
            <MacroBar
              label="Carbs"
              value={round(totals?.carbsG)}
              goal={goal?.carbsG ?? 0}
              color="#FF9500"
            />
            <MacroBar
              label="Fat"
              value={round(totals?.fatG)}
              goal={goal?.fatG ?? 0}
              color="#5856D6"
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

        {/* Dynamic meal category cards */}
        {categories.map((cat) => {
          const entries = entriesForCategory(cat.categoryId);
          const catCals = entries.reduce((sum, e) => sum + round(e.calories), 0);
          return (
            <View
              key={cat.categoryId}
              style={[
                styles.card,
                { backgroundColor: t.cardBg, borderColor: t.cardBorder },
              ]}
            >
              <View style={styles.mealHeader}>
                <Text style={[styles.mealTitle, { color: t.text }]}>
                  {cat.name}
                </Text>
                <View style={styles.mealHeaderRight}>
                  <Text style={[styles.mealCals, { color: t.secondary }]}>
                    {catCals} cal
                  </Text>
                  <TouchableOpacity
                    hitSlop={10}
                    onPress={() => handleDeleteCategory(cat)}
                    style={styles.deleteBtn}
                    accessibilityLabel={`Delete ${cat.name}`}
                  >
                    <Ionicons name="trash-outline" size={16} color={t.secondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {entries.map((e) => (
                <MealEntryRow key={e.entryId} entry={e} />
              ))}

              <TouchableOpacity
                style={styles.addRow}
                onPress={() =>
                  navigation.navigate("FoodSearch", {
                    categoryId: cat.categoryId,
                    categoryName: cat.name,
                  })
                }
              >
                <Ionicons name="add-circle-outline" size={20} color={t.tint} />
                <Text style={[styles.addText, { color: t.tint }]}>
                  Add food
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add new meal category */}
        {isAddingCategory ? (
          <View
            style={[
              styles.card,
              styles.addCategoryCard,
              { backgroundColor: t.cardBg, borderColor: t.cardBorder },
            ]}
          >
            <TextInput
              ref={addInputRef}
              autoFocus
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Meal name (e.g. Snacks)"
              placeholderTextColor={t.secondary}
              returnKeyType="done"
              onSubmitEditing={handleCreateCategory}
              onBlur={() => {
                // Small delay so tapping "Done" on keyboard doesn't fire onBlur
                // before onSubmitEditing.
                setTimeout(() => {
                  if (newCategoryName.trim() === "") {
                    setIsAddingCategory(false);
                  }
                }, 150);
              }}
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
              Add meal
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MealEntryRow({ entry }: { entry: FoodLogEntry }) {
  const t = useThemeColors();
  const { removeLog } = useNutrition();
  return (
    <View style={[styles.entryRow, { borderTopColor: t.separator }]}>
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
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  remainingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  remainingBlock: { alignItems: "flex-start" },
  bigNumber: { fontSize: 40, fontWeight: "700" },
  caption: { fontSize: 13, marginTop: 2 },
  calMath: { alignItems: "flex-end" },
  calMathText: { fontSize: 13, marginVertical: 1 },
  macros: { marginTop: 16, gap: 10 },
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
  addCategoryCard: { gap: 0 },
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
