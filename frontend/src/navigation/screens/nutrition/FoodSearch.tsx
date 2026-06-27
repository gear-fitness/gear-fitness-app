import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { searchFoods } from "../../../api/nutritionService";
import { FoodItem, MealType } from "../../../api/types";

const round = (n: number | null | undefined) => Math.round(n ?? 0);

export function FoodSearch() {
  const t = useThemeColors();
  const navigation = useNavigation<any>();
  const { mealType } = useRoute<any>().params as { mealType: MealType };

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const handle = setTimeout(async () => {
      try {
        const data = await searchFoods(q);
        if (reqId.current === id) setResults(data);
      } catch (err) {
        console.error("Food search failed:", err);
        if (reqId.current === id) setResults([]);
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Close"
          hitSlop={12}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-down" size={26} color={t.text} />
        </TouchableOpacity>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods"
          autoFocus
          returnKeyType="search"
          style={styles.search}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.foodId}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={t.secondary} />
          ) : query.trim().length >= 2 ? (
            <Text style={[styles.empty, { color: t.secondary }]}>
              No foods found
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: t.separator }]}
            onPress={() =>
              navigation.navigate("FoodDetail", { food: item, mealType })
            }
          >
            <View style={styles.rowInfo}>
              <Text
                style={[styles.name, { color: t.text }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
              <Text style={[styles.meta, { color: t.secondary }]}>
                {round(item.calories)} cal
                {item.brandOwner ? ` · ${item.brandOwner}` : ""} · per 100g
              </Text>
            </View>
            <Ionicons name="add" size={22} color={t.tint} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  search: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowInfo: { flex: 1, paddingRight: 12 },
  name: { fontSize: 15, fontWeight: "500" },
  meta: { fontSize: 12, marginTop: 3 },
  empty: { textAlign: "center", marginTop: 32, fontSize: 14 },
});
