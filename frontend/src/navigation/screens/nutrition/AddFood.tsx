import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SearchBar } from "../../../components/SearchBar";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { useNutrition } from "../../../context/NutritionContext";
import { searchFoods } from "../../../api/nutritionService";
import { FoodItem } from "../../../api/types";

const round = (n: number | null | undefined) => Math.round(n ?? 0);

// Per-serving values for display + quick-add snapshot. Nutrients are stored per
// 100 g; a serving uses the food's serving size (defaulting to 100 g).
function perServing(food: FoodItem) {
  const factor = (food.servingSize ?? 100) / 100;
  return {
    calories: (food.calories ?? 0) * factor,
    proteinG: (food.proteinG ?? 0) * factor,
    carbsG: (food.carbsG ?? 0) * factor,
    fatG: (food.fatG ?? 0) * factor,
  };
}

function servingLabel(food: FoodItem): string {
  if (food.householdServing) return food.householdServing;
  if (food.servingSize) return `${food.servingSize}${food.servingUnit ?? "g"}`;
  return "100 g";
}

export function AddFood() {
  const t = useThemeColors();
  const navigation = useNavigation<any>();
  const routeCategory = (useRoute<any>().params as { category?: string } | undefined)
    ?.category;

  const { categories, addLog } = useNutrition();
  const [category, setCategory] = useState<string>(
    routeCategory ?? categories[0] ?? "Breakfast",
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  // Per-food add state so the row's "+" can show a spinner then a checkmark.
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const isSearching = query.trim().length >= 2;

  // Both the pre-search browse list and search results come from the same
  // /nutrition/foods/search endpoint (a blank query returns the browse list),
  // so there is a single food source — the seeded food_item table.
  useEffect(() => {
    const q = query.trim();
    const apiQuery = q.length >= 2 ? q : "";
    setLoading(true);
    const id = ++reqId.current;
    const handle = setTimeout(
      async () => {
        try {
          const data = await searchFoods(apiQuery);
          if (reqId.current === id) setResults(data);
        } catch (err) {
          console.error("Food search failed:", err);
          if (reqId.current === id) setResults([]);
        } finally {
          if (reqId.current === id) setLoading(false);
        }
      },
      // Debounce real searches; load the browse list immediately on mount.
      q.length >= 2 ? 300 : 0,
    );
    return () => clearTimeout(handle);
  }, [query]);

  const handleAdd = async (food: FoodItem) => {
    if (addingId) return;
    setAddingId(food.foodId);
    try {
      await addLog({
        foodId: food.foodId,
        category,
        quantity: 1,
        unit: "SERVING",
      });
      setAddedIds((prev) => ({ ...prev, [food.foodId]: true }));
    } catch (err) {
      console.error("Failed to add food:", err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
      {/* Header: close + tappable category selector */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryBtn}
          accessibilityLabel="Change meal"
          hitSlop={8}
          onPress={() => setPickerOpen(true)}
        >
          <Text style={[styles.categoryText, { color: t.tint }]}>
            {category}
          </Text>
          <Ionicons name="chevron-down" size={18} color={t.tint} />
        </TouchableOpacity>

        {/* Spacer to keep the category centered opposite the close button. */}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods"
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.foodId}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={[styles.sectionLabel, { color: t.secondary }]}>
            {isSearching ? "Results" : "Popular foods"}
          </Text>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={t.secondary} />
          ) : isSearching ? (
            <Text style={[styles.empty, { color: t.secondary }]}>
              No foods found
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const macros = perServing(item);
          const added = addedIds[item.foodId];
          const busy = addingId === item.foodId;
          return (
            <View
              style={[
                styles.row,
                { backgroundColor: t.cardBg, borderColor: t.cardBorder },
              ]}
            >
              <View style={styles.rowInfo}>
                <Text
                  style={[styles.name, { color: t.text }]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
                <Text style={[styles.meta, { color: t.secondary }]}>
                  {round(macros.calories)} cal · {servingLabel(item)}
                </Text>
                <Text style={[styles.macros, { color: t.secondary }]}>
                  P {round(macros.proteinG)}g · C {round(macros.carbsG)}g · F{" "}
                  {round(macros.fatG)}g
                </Text>
              </View>

              <TouchableOpacity
                accessibilityLabel={`Add ${item.description} to ${category}`}
                hitSlop={10}
                disabled={busy}
                onPress={() => handleAdd(item)}
                style={[styles.addBtn, { backgroundColor: t.surface }]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={t.tint} />
                ) : added ? (
                  <Ionicons name="checkmark" size={22} color={t.tint} />
                ) : (
                  <Ionicons name="add" size={22} color={t.tint} />
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Category picker bottom sheet */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: t.cardBg, borderColor: t.cardBorder },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: t.handle }]} />
            <Text style={[styles.sheetTitle, { color: t.text }]}>
              Add to meal
            </Text>
            {categories.map((name) => {
              const selected = name === category;
              return (
                <TouchableOpacity
                  key={name}
                  style={styles.sheetRow}
                  onPress={() => {
                    setCategory(name);
                    setPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sheetRowText,
                      { color: t.text },
                      selected && styles.sheetRowTextSelected,
                    ]}
                  >
                    {name}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark" size={20} color={t.tint} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryText: { fontSize: 17, fontWeight: "700" },
  headerSpacer: { width: 26 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  rowInfo: { flex: 1, paddingRight: 12 },
  name: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 13, marginTop: 4 },
  macros: { fontSize: 12, marginTop: 2 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { textAlign: "center", marginTop: 32, fontSize: 14 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", marginBottom: 6 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  sheetRowText: { fontSize: 17 },
  sheetRowTextSelected: { fontWeight: "700" },
});
