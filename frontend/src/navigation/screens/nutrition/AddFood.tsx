import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
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
import { getUserFoods, searchFoods } from "../../../api/nutritionService";
import { FoodItem, MeasureUnit, MeasureUnitKey } from "../../../api/types";
import {
  buildUnits,
  gramsPerUnit,
  looksVolumetric,
  servingGramsOf,
} from "../../../utils/nutritionUnits";

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

  // Measured bottom edge of the header so the category dropdown opens just
  // below the button rather than overlapping it (the overlay starts at the
  // very top of the screen, behind the safe-area inset).
  const [headerBottom, setHeaderBottom] = useState(0);

  // Per-food add state so the row's "+" can show a spinner then a checkmark.
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Which row's portion dropdown is open. Hoisted here (rather than per-row) so
  // only one can be expanded at a time — opening one closes any other.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Transient "Logged!" confirmation toast.
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showLoggedToast = () => {
    toastOpacity.stopAnimation();
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.delay(900),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setToastVisible(false);
    });
  };

  const isSearching = query.trim().length >= 2;

  // Search results come from /nutrition/foods/search. Before the user types,
  // show their own foods (recent + frequent) from /nutrition/foods/recent
  // instead of a generic list — both return the same FoodItem shape.
  useEffect(() => {
    const q = query.trim();
    const searching = q.length >= 2;
    setLoading(true);
    const id = ++reqId.current;
    const handle = setTimeout(
      async () => {
        try {
          const data = searching ? await searchFoods(q) : await getUserFoods();
          if (reqId.current === id) setResults(data);
        } catch (err) {
          console.error("Food search failed:", err);
          if (reqId.current === id) setResults([]);
        } finally {
          if (reqId.current === id) setLoading(false);
        }
      },
      // Debounce real searches; load the user's foods immediately on mount.
      searching ? 300 : 0,
    );
    return () => clearTimeout(handle);
  }, [query]);

  // Logs a food. Defaults to a single serving (the quick "+"); the expandable
  // row passes an explicit unit + quantity. The backend only stores
  // SERVING/GRAM, so non-serving units are converted to their gram equivalent
  // (mirrors EditEntrySheet), with the chosen unit kept as client-side metadata.
  const handleAdd = async (
    food: FoodItem,
    opts?: { unitKey: MeasureUnitKey; quantity: number },
  ) => {
    if (addingId) return;
    const unitKey = opts?.unitKey ?? "serving";
    const quantity = opts?.quantity ?? 1;
    setAddingId(food.foodId);
    try {
      const servingGrams = servingGramsOf(food);
      const grams = quantity * gramsPerUnit(unitKey, servingGrams, food.units);
      const backendUnit = unitKey === "serving" ? "SERVING" : "GRAM";
      const backendQty = unitKey === "serving" ? quantity : grams;
      await addLog(
        {
          foodId: food.foodId,
          category,
          quantity: backendQty,
          unit: backendUnit,
        },
        { unitKey, quantity, servingGrams, units: food.units },
      );
      setAddedIds((prev) => ({ ...prev, [food.foodId]: true }));
      showLoggedToast();
    } catch (err) {
      console.error("Failed to add food:", err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
      {/* Header: close + tappable category selector */}
      <View
        style={styles.header}
        onLayout={(e) =>
          setHeaderBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)
        }
      >
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
          <Ionicons
            name={pickerOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={t.tint}
          />
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
          // Hide the section label when there are no suggestions yet, so the
          // "start logging" prompt stands on its own.
          results.length === 0 && !isSearching && !loading ? null : (
            <Text style={[styles.sectionLabel, { color: t.secondary }]}>
              {isSearching ? "Results" : "Suggested"}
            </Text>
          )
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={t.secondary} />
          ) : isSearching ? (
            <Text style={[styles.empty, { color: t.secondary }]}>
              No foods found
            </Text>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="restaurant-outline"
                size={64}
                color={t.border}
              />
              <Text style={[styles.emptyText, { color: t.text }]}>
                No suggestions yet
              </Text>
              <Text style={[styles.emptySubtext, { color: t.secondary }]}>
                Start logging to get suggestions!
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <FoodRow
            food={item}
            category={category}
            t={t}
            added={!!addedIds[item.foodId]}
            busy={addingId === item.foodId}
            expanded={expandedId === item.foodId}
            onToggleExpand={() =>
              setExpandedId((prev) =>
                prev === item.foodId ? null : item.foodId,
              )
            }
            onCollapse={() =>
              setExpandedId((prev) => (prev === item.foodId ? null : prev))
            }
            onLog={handleAdd}
          />
        )}
      />

      {/* Category dropdown — anchored under the header button */}
      {pickerOpen && (
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable
            style={[
              styles.dropdown,
              {
                marginTop: headerBottom + 4,
                backgroundColor: t.cardBg,
                borderColor: t.cardBorder,
              },
            ]}
          >
            {categories.map((name) => {
              const selected = name === category;
              return (
                <TouchableOpacity
                  key={name}
                  style={styles.dropdownRow}
                  onPress={() => {
                    setCategory(name);
                    setPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      { color: t.text },
                      selected && styles.dropdownTextSelected,
                    ]}
                  >
                    {name}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark" size={18} color={t.tint} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      )}

      {/* "Logged!" confirmation toast */}
      {toastVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { opacity: toastOpacity, backgroundColor: t.accent },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={t.accentText}
          />
          <Text style={[styles.toastText, { color: t.accentText }]}>
            Logged!
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

/**
 * A single food result. Collapsed it shows the name/macros with a quick "+"
 * (logs one serving) and a chevron to expand. Expanded it reveals a Serving
 * Size unit selector and a Quantity stepper, then a "Log to {category}" button
 * that logs the chosen amount.
 */
function FoodRow({
  food,
  category,
  t,
  added,
  busy,
  expanded,
  onToggleExpand,
  onCollapse,
  onLog,
}: {
  food: FoodItem;
  category: string;
  t: ReturnType<typeof useThemeColors>;
  added: boolean;
  busy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onCollapse: () => void;
  onLog: (
    food: FoodItem,
    opts?: { unitKey: MeasureUnitKey; quantity: number },
  ) => Promise<void>;
}) {
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [unitKey, setUnitKey] = useState<MeasureUnitKey>("serving");
  const [quantity, setQuantity] = useState(1);

  // Units offered for this food. The "serving" option is labelled with the
  // food's household serving (e.g. "4 oz", "1 cup") so it reads like the meta.
  const unitOptions: MeasureUnit[] = useMemo(() => {
    const base = buildUnits(servingGramsOf(food), {
      includeVolume: looksVolumetric(food.servingUnit),
    });
    return base.map((u) =>
      u.key === "serving" ? { ...u, label: servingLabel(food) } : u,
    );
  }, [food]);

  const currentUnit =
    unitOptions.find((u) => u.key === unitKey) ?? unitOptions[0];

  const macros = perServing(food);

  const handleLog = async () => {
    await onLog(food, { unitKey, quantity });
    onCollapse();
  };

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: t.cardBg, borderColor: t.cardBorder },
      ]}
    >
      <View style={styles.rowTop}>
        <View style={styles.rowInfo}>
          <Text style={[styles.name, { color: t.text }]} numberOfLines={2}>
            {food.description}
          </Text>
          <Text style={[styles.meta, { color: t.secondary }]}>
            {round(macros.calories)} cal · {servingLabel(food)}
          </Text>
          <Text style={[styles.macros, { color: t.secondary }]}>
            P {round(macros.proteinG)}g · C {round(macros.carbsG)}g · F{" "}
            {round(macros.fatG)}g
          </Text>
        </View>

        <View style={styles.rowActions}>
          <TouchableOpacity
            accessibilityLabel={expanded ? "Hide options" : "Choose amount"}
            hitSlop={8}
            onPress={onToggleExpand}
            style={[styles.circleBtn, { backgroundColor: t.surface }]}
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={t.secondary}
            />
          </TouchableOpacity>

          {!expanded && (
            <TouchableOpacity
              accessibilityLabel={`Add ${food.description} to ${category}`}
              hitSlop={8}
              disabled={busy}
              onPress={() => onLog(food)}
              style={[styles.circleBtn, { backgroundColor: t.surface }]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={t.tint} />
              ) : added ? (
                <Ionicons name="checkmark" size={22} color={t.tint} />
              ) : (
                <Ionicons name="add" size={22} color={t.tint} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.expanded}>
          <View style={styles.controlsRow}>
            {/* Serving size — unit selector */}
            <View style={styles.controlCol}>
              <TouchableOpacity
                style={[styles.selectBox, { borderColor: t.border }]}
                onPress={() => setUnitPickerOpen((o) => !o)}
              >
                <Text
                  style={[styles.selectText, { color: t.text }]}
                  numberOfLines={1}
                >
                  {currentUnit?.label}
                </Text>
                <Ionicons name="chevron-down" size={18} color={t.secondary} />
              </TouchableOpacity>
              <Text style={[styles.controlLabel, { color: t.secondary }]}>
                Serving Size
              </Text>
            </View>

            {/* Quantity stepper */}
            <View style={styles.controlCol}>
              <View style={[styles.stepper, { borderColor: t.border }]}>
                <TouchableOpacity
                  accessibilityLabel="Decrease quantity"
                  hitSlop={8}
                  disabled={quantity <= 1}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={styles.stepperBtn}
                >
                  <Ionicons
                    name="remove"
                    size={22}
                    color={quantity <= 1 ? t.border : t.text}
                  />
                </TouchableOpacity>
                <Text style={[styles.stepperValue, { color: t.text }]}>
                  {quantity}
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Increase quantity"
                  hitSlop={8}
                  onPress={() => setQuantity((q) => q + 1)}
                  style={styles.stepperBtn}
                >
                  <Ionicons name="add" size={22} color={t.text} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.controlLabel, { color: t.secondary }]}>
                Quantity
              </Text>
            </View>
          </View>

          {unitPickerOpen && (
            <View style={styles.chipRow}>
              {unitOptions.map((u) => {
                const selected = u.key === unitKey;
                return (
                  <TouchableOpacity
                    key={u.key}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? t.accent : t.surface,
                        borderColor: t.cardBorder,
                      },
                    ]}
                    onPress={() => {
                      setUnitKey(u.key);
                      setUnitPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? t.accentText : t.text },
                      ]}
                    >
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: t.accent }]}
            disabled={busy}
            onPress={handleLog}
          >
            {busy ? (
              <ActivityIndicator size="small" color={t.accentText} />
            ) : (
              <Text style={[styles.logBtnText, { color: t.accentText }]}>
                Log to {category}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 10,
  },
  row: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowInfo: { flex: 1, paddingRight: 12 },
  name: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 13, marginTop: 4 },
  macros: { fontSize: 12, marginTop: 2 },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  expanded: { marginTop: 14 },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  controlCol: { flex: 1 },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  selectText: { fontSize: 16, fontWeight: "600", flex: 1 },
  controlLabel: { fontSize: 13, marginTop: 6, marginLeft: 2 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 4,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: { fontSize: 16, fontWeight: "600", minWidth: 24, textAlign: "center" },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 14, fontWeight: "500" },
  logBtn: {
    marginTop: 16,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  logBtnText: { fontSize: 16, fontWeight: "700" },
  empty: { textAlign: "center", marginTop: 32, fontSize: 14 },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: { fontSize: 20, fontWeight: "600", marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: "center" },
  dropdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
  },
  dropdown: {
    minWidth: 200,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  dropdownText: { fontSize: 16 },
  dropdownTextSelected: { fontWeight: "700" },
  toast: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastText: { fontSize: 15, fontWeight: "700" },
});
