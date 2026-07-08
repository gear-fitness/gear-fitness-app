import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../../components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useNavigation } from "@react-navigation/native";
import { SearchBar } from "../../../components/SearchBar";
import { FloatingKeyboardDismiss } from "../../../components/FloatingKeyboardDismiss";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { useTier } from "../../../hooks/useTier";
import { useNutrition } from "../../../context/NutritionContext";
import {
  createCustomFood,
  getUserFoods,
  searchFoods,
} from "../../../api/nutritionService";
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

// A circular action button in the app's liquid-glass style. When glass is
// available the touchable is wrapped in a GlassView clipped to a circle with a
// transparent background; otherwise it falls back to the plain surface circle.
// All TouchableOpacity behavior (onPress, disabled, hitSlop, etc.) is forwarded.
function GlassCircleButton({
  glassAvailable,
  surface,
  size = 36,
  children,
  ...touchable
}: React.ComponentProps<typeof TouchableOpacity> & {
  glassAvailable: boolean;
  surface: string;
  size?: number;
  children: React.ReactNode;
}) {
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (glassAvailable) {
    return (
      <GlassView
        style={[styles.glassCircle, circle]}
        glassEffectStyle="regular"
      >
        <TouchableOpacity
          {...touchable}
          style={[styles.circleBtn, circle, { backgroundColor: "transparent" }]}
        >
          {children}
        </TouchableOpacity>
      </GlassView>
    );
  }

  return (
    <TouchableOpacity
      {...touchable}
      style={[styles.circleBtn, { backgroundColor: surface }]}
    >
      {children}
    </TouchableOpacity>
  );
}

export function AddFood() {
  const t = useThemeColors();
  const navigation = useNavigation() as any;
  const { atLeast } = useTier();

  const { addLog } = useNutrition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  // The whole tracker is Plus-gated, but this screen is reachable directly
  // (deep links, stale entry points) — bounce non-Plus users to the upsell
  // rather than letting them search foods they can't log.
  useEffect(() => {
    if (!atLeast("PLUS")) {
      navigation.goBack();
      navigation.navigate("PlusUpsell", {
        feature: "Track calories and macros with the food journal",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-food add state so the row's "+" can show a spinner then a checkmark.
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Per-food save-to-favorites state (spinner, then a filled bookmark).
  const [favSavingId, setFavSavingId] = useState<string | null>(null);
  const [favSavedIds, setFavSavedIds] = useState<Record<string, boolean>>({});

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
          quantity: backendQty,
          unit: backendUnit,
          // Journal provenance: a database pick, so the journal materializes a
          // "db" line for it (and the AI orphan reaper never touches it).
          sourceType: "DB",
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

  // Save a search result to the user's favorites (custom foods) so it's one
  // tap to log later. Snapshots the food's per-serving nutrition; custom foods
  // don't offer this (they're already favorites).
  const handleSaveFavorite = async (food: FoodItem) => {
    if (favSavingId || favSavedIds[food.foodId]) return;
    setFavSavingId(food.foodId);
    try {
      const macros = perServing(food);
      await createCustomFood({
        description: food.description,
        calories: macros.calories,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
      });
      setFavSavedIds((prev) => ({ ...prev, [food.foodId]: true }));
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    } catch (err) {
      console.error("Failed to save favorite:", err);
    } finally {
      setFavSavingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
      {/* Header: close + title */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: t.text }]}>Add food</Text>

        {/* Spacer to keep the title centered opposite the close button. */}
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
              <Ionicons name="restaurant-outline" size={64} color={t.border} />
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
            t={t}
            added={!!addedIds[item.foodId]}
            busy={addingId === item.foodId}
            favSaved={!!favSavedIds[item.foodId]}
            favBusy={favSavingId === item.foodId}
            onSaveFavorite={() => handleSaveFavorite(item)}
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

      {/* "Logged!" confirmation toast */}
      {toastVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { opacity: toastOpacity, backgroundColor: t.accent },
          ]}
        >
          <Ionicons name="checkmark-circle" size={18} color={t.accentText} />
          <Text style={[styles.toastText, { color: t.accentText }]}>
            Logged!
          </Text>
        </Animated.View>
      )}

      <FloatingKeyboardDismiss />
    </SafeAreaView>
  );
}

/**
 * A single food result. Collapsed it shows the name/macros with a bookmark
 * (save to favorites) and a quick "+" (logs one serving); tapping the card
 * itself expands it, revealing a Serving Size unit selector and a Quantity
 * stepper, then a "Log" button that logs the chosen amount.
 */
function FoodRow({
  food,
  t,
  added,
  busy,
  favSaved,
  favBusy,
  onSaveFavorite,
  expanded,
  onToggleExpand,
  onCollapse,
  onLog,
}: {
  food: FoodItem;
  t: ReturnType<typeof useThemeColors>;
  added: boolean;
  busy: boolean;
  favSaved: boolean;
  favBusy: boolean;
  onSaveFavorite: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onCollapse: () => void;
  onLog: (
    food: FoodItem,
    opts?: { unitKey: MeasureUnitKey; quantity: number },
  ) => Promise<void>;
}) {
  const glassAvailable = isLiquidGlassAvailable();
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [unitKey, setUnitKey] = useState<MeasureUnitKey>("serving");
  // Held as text so the number is directly editable (decimal-pad, like the
  // exercise inputs); the steppers read/write through it.
  const [quantityText, setQuantityText] = useState("1");
  const quantity = parseFloat(quantityText) || 0;

  const stepQuantity = (delta: number) => {
    const next =
      Math.round(Math.max(1, quantity + delta) * 100) / 100;
    setQuantityText(String(next));
  };

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
    if (quantity <= 0) return;
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
      {/* The whole header is the expand/collapse affordance; the circle
          buttons sit on top and win their own taps. */}
      <TouchableOpacity
        style={styles.rowTop}
        activeOpacity={0.7}
        onPress={onToggleExpand}
        accessibilityLabel={
          expanded
            ? `Hide options for ${food.description}`
            : `Choose amount for ${food.description}`
        }
      >
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
          {/* Save to favorites — custom foods are already favorites. */}
          {food.dataType !== "CUSTOM" && (
            <GlassCircleButton
              glassAvailable={glassAvailable}
              surface={t.surface}
              accessibilityLabel={
                favSaved
                  ? `${food.description} saved to favorites`
                  : `Save ${food.description} to favorites`
              }
              hitSlop={8}
              disabled={favBusy}
              onPress={onSaveFavorite}
            >
              {favBusy ? (
                <ActivityIndicator size="small" color={t.tint} />
              ) : (
                <Ionicons
                  name={favSaved ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={t.tint}
                />
              )}
            </GlassCircleButton>
          )}

          {!expanded && (
            <GlassCircleButton
              glassAvailable={glassAvailable}
              surface={t.surface}
              accessibilityLabel={`Add ${food.description}`}
              hitSlop={8}
              disabled={busy}
              onPress={() => onLog(food)}
            >
              {busy ? (
                <ActivityIndicator size="small" color={t.tint} />
              ) : added ? (
                <Ionicons name="checkmark" size={22} color={t.tint} />
              ) : (
                <MaterialCommunityIcons name="plus" size={22} color={t.tint} />
              )}
            </GlassCircleButton>
          )}
        </View>
      </TouchableOpacity>

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
                  onPress={() => stepQuantity(-1)}
                  style={styles.stepperBtn}
                >
                  <Ionicons
                    name="remove"
                    size={22}
                    color={quantity <= 1 ? t.border : t.tint}
                  />
                </TouchableOpacity>
                <TextInput
                  value={quantityText}
                  onChangeText={setQuantityText}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={t.secondary}
                  maxLength={6}
                  selectTextOnFocus
                  accessibilityLabel="Quantity"
                  style={[styles.stepperValue, { color: t.text }]}
                />
                <TouchableOpacity
                  accessibilityLabel="Increase quantity"
                  hitSlop={8}
                  onPress={() => stepQuantity(1)}
                  style={styles.stepperBtn}
                >
                  <Ionicons name="add" size={22} color={t.tint} />
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
            disabled={busy || quantity <= 0}
            onPress={handleLog}
          >
            {busy ? (
              <ActivityIndicator size="small" color={t.accentText} />
            ) : (
              <Text style={[styles.logBtnText, { color: t.accentText }]}>
                Log
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
  headerTitle: { fontSize: 17, fontWeight: "700" },
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
  // Clips the GlassView to a circle so the liquid-glass effect stays rounded.
  glassCircle: { overflow: "hidden" },
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
  stepperValue: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "center",
    paddingVertical: 0,
  },
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
