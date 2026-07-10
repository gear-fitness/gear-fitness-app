import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../../components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { useNutrition } from "../../../context/NutritionContext";
import { FoodItem, MeasureUnit, MeasureUnitKey } from "../../../api/types";
import {
  buildUnits,
  gramsPerUnit,
  looksVolumetric,
  servingGramsOf,
} from "../../../utils/nutritionUnits";

// Review screen for a scanned barcode hit, presented as a pageSheet modal.
// The user picks the product's own serving or a custom amount, sets a
// servings count, watches the totals update live, then Adds the entry
// (sourceType "BARCODE", so the journal materializes a line for it).

const round = (n: number) => Math.round(n);

function servingLabel(food: FoodItem): string {
  if (food.householdServing) return food.householdServing;
  if (food.servingSize) return `${food.servingSize}${food.servingUnit ?? "g"}`;
  return "100 g";
}

export function BarcodeReview() {
  const t = useThemeColors();
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  // Always set by useCameraFoodLog's navigate; the null fallback only keeps
  // the hooks below crash-free for a malformed deep link (render bails out).
  const food = (route.params?.food ?? null) as FoodItem | null;

  const { addLog } = useNutrition();

  const [mode, setMode] = useState<"serving" | "custom">("serving");
  const [unitKey, setUnitKey] = useState<MeasureUnitKey>("g");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const servingGrams = food ? servingGramsOf(food) : 100;

  // Custom amount, prefilled with the product's own serving so switching to
  // custom starts from something sensible instead of a blank field.
  const [amountText, setAmountText] = useState(String(servingGrams));
  const amount = parseFloat(amountText) || 0;

  // Editable servings count, stepper +/- 1 with a floor of 1 on the buttons
  // (typing still allows fractions like 0.5).
  const [servingsText, setServingsText] = useState("1");
  const servings = parseFloat(servingsText) || 0;

  const stepServings = (delta: number) => {
    const next = Math.round(Math.max(1, servings + delta) * 100) / 100;
    setServingsText(String(next));
  };

  const customUnits: MeasureUnit[] = useMemo(
    () =>
      buildUnits(servingGrams, {
        includeServing: false,
        includeVolume: looksVolumetric(food?.servingUnit),
      }),
    [servingGrams, food?.servingUnit],
  );
  const currentUnit =
    customUnits.find((u) => u.key === unitKey) ?? customUnits[0];

  // Grams in ONE selected serving (product serving or custom amount); the
  // servings count multiplies it. Nutrients are per 100 g.
  const gramsPerSelected =
    mode === "serving"
      ? servingGrams
      : amount * gramsPerUnit(currentUnit.key, servingGrams, food?.units);
  const totalGrams = gramsPerSelected * servings;
  const factor = totalGrams / 100;

  const totals = {
    calories: (food?.calories ?? 0) * factor,
    proteinG: (food?.proteinG ?? 0) * factor,
    carbsG: (food?.carbsG ?? 0) * factor,
    fatG: (food?.fatG ?? 0) * factor,
  };

  const perServingFactor = servingGrams / 100;
  const servingMacroLine =
    `${round((food?.calories ?? 0) * perServingFactor)} cal · ` +
    `${round((food?.proteinG ?? 0) * perServingFactor)}g protein · ` +
    `${round((food?.carbsG ?? 0) * perServingFactor)}g carbs · ` +
    `${round((food?.fatG ?? 0) * perServingFactor)}g fat`;

  const selectedLabel = !food
    ? ""
    : mode === "serving"
      ? servings === 1
        ? servingLabel(food)
        : `${servings} × ${servingLabel(food)}`
      : `${Math.round(amount * servings * 100) / 100} ${currentUnit.label}`;

  const canAdd = !!food && totalGrams > 0 && !adding;

  // Mirrors AddFood's handleAdd: the backend stores SERVING/GRAM, so the
  // product-serving path logs servings directly and the custom path logs the
  // gram equivalent, with the chosen unit kept as client-side metadata.
  const handleAdd = async () => {
    if (!canAdd || !food) return;
    setAdding(true);
    try {
      const backendUnit = mode === "serving" ? "SERVING" : "GRAM";
      const backendQty = mode === "serving" ? servings : totalGrams;
      const metaUnitKey: MeasureUnitKey =
        mode === "serving" ? "serving" : currentUnit.key;
      const metaQuantity = mode === "serving" ? servings : amount * servings;
      await addLog(
        {
          foodId: food.foodId,
          quantity: backendQty,
          unit: backendUnit,
          sourceType: "BARCODE",
        },
        {
          unitKey: metaUnitKey,
          quantity: metaQuantity,
          servingGrams,
          units: food.units,
        },
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      navigation.goBack();
    } catch (err) {
      console.error("Failed to log scanned food:", err);
      setAdding(false);
    }
  };

  if (!food) return null;

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[styles.container, { backgroundColor: t.appBg }]}
    >
      {/* Header: Close / title / Add */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Close"
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={[styles.headerPill, { backgroundColor: t.surface }]}
        >
          <Text style={[styles.headerPillText, { color: t.text }]}>Close</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: t.text }]}>
          Review Product
        </Text>

        <TouchableOpacity
          accessibilityLabel="Add to log"
          hitSlop={12}
          disabled={!canAdd}
          onPress={handleAdd}
          style={[
            styles.headerPill,
            { backgroundColor: t.accent },
            !canAdd && { opacity: 0.5 },
          ]}
        >
          {adding ? (
            <ActivityIndicator size="small" color={t.accentText} />
          ) : (
            <Text style={[styles.headerPillText, { color: t.accentText }]}>
              Add
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Product card */}
        <View
          style={[
            styles.card,
            { backgroundColor: t.cardBg, borderColor: t.cardBorder },
          ]}
        >
          <Text style={[styles.productName, { color: t.text }]}>
            {food.description}
          </Text>
          {!!food.brandOwner && (
            <Text style={[styles.productBrand, { color: t.secondary }]}>
              {food.brandOwner}
            </Text>
          )}
          <Text style={[styles.productHelper, { color: t.secondary }]}>
            We found nutrition for this barcode. Pick the serving that matches
            what you ate before adding it to your log.
          </Text>
        </View>

        {/* Serving options */}
        <View
          style={[
            styles.card,
            { backgroundColor: t.cardBg, borderColor: t.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: t.text }]}>
            Serving Options
          </Text>
          <Text style={[styles.sectionHelper, { color: t.secondary }]}>
            Pick the serving you want as the starting point. Use the custom
            amount option if you want to switch units or fine-tune the amount.
          </Text>

          <TouchableOpacity
            accessibilityLabel={`Log by ${servingLabel(food)}`}
            activeOpacity={0.8}
            onPress={() => setMode("serving")}
            style={[
              styles.optionCard,
              { borderColor: mode === "serving" ? t.accent : t.border },
              mode === "serving" && styles.optionCardSelected,
            ]}
          >
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: t.text }]}>
                {servingLabel(food)}
              </Text>
              <Text style={[styles.optionSubtitle, { color: t.secondary }]}>
                {servingMacroLine}
              </Text>
            </View>
            <Ionicons
              name={mode === "serving" ? "checkmark-circle" : "ellipse-outline"}
              size={26}
              color={mode === "serving" ? t.accent : t.border}
            />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Log a custom amount"
            activeOpacity={0.8}
            onPress={() => setMode("custom")}
            style={[
              styles.optionCard,
              { borderColor: mode === "custom" ? t.accent : t.border },
              mode === "custom" && styles.optionCardSelected,
            ]}
          >
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: t.text }]}>
                Custom Amount
              </Text>
              <Text style={[styles.optionSubtitle, { color: t.secondary }]}>
                Enter your own amount and switch units like{" "}
                {customUnits.map((u) => u.label).join(", ")}.
              </Text>
            </View>
            <Ionicons
              name={mode === "custom" ? "checkmark-circle" : "ellipse-outline"}
              size={26}
              color={mode === "custom" ? t.accent : t.border}
            />
          </TouchableOpacity>
        </View>

        {/* Custom amount input, shown only in custom mode */}
        {mode === "custom" && (
          <View
            style={[
              styles.card,
              { backgroundColor: t.cardBg, borderColor: t.cardBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: t.text }]}>
              Custom Amount
            </Text>
            <View style={[styles.amountRow, { borderColor: t.border }]}>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={t.secondary}
                maxLength={7}
                selectTextOnFocus
                accessibilityLabel="Amount"
                style={[styles.amountInput, { color: t.text }]}
              />
              <TouchableOpacity
                accessibilityLabel="Change unit"
                style={styles.unitToggle}
                onPress={() => setUnitPickerOpen((o) => !o)}
              >
                <Text style={[styles.unitToggleText, { color: t.text }]}>
                  {currentUnit.label}
                </Text>
                <Ionicons name="chevron-down" size={16} color={t.secondary} />
              </TouchableOpacity>
            </View>
            {unitPickerOpen && (
              <View style={styles.chipRow}>
                {customUnits.map((u) => {
                  const selected = u.key === currentUnit.key;
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
          </View>
        )}

        {/* Servings count */}
        <View
          style={[
            styles.card,
            { backgroundColor: t.cardBg, borderColor: t.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: t.text }]}>
            Number of Servings
          </Text>
          <View style={[styles.stepper, { borderColor: t.border }]}>
            <TouchableOpacity
              accessibilityLabel="Decrease servings"
              hitSlop={8}
              disabled={servings <= 1}
              onPress={() => stepServings(-1)}
              style={[
                styles.stepperBtn,
                { backgroundColor: t.accent },
                servings <= 1 && { opacity: 0.35 },
              ]}
            >
              <Ionicons name="remove" size={22} color={t.accentText} />
            </TouchableOpacity>
            <TextInput
              value={servingsText}
              onChangeText={setServingsText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={t.secondary}
              maxLength={6}
              selectTextOnFocus
              accessibilityLabel="Number of servings"
              style={[styles.stepperValue, { color: t.text }]}
            />
            <TouchableOpacity
              accessibilityLabel="Increase servings"
              hitSlop={8}
              onPress={() => stepServings(1)}
              style={[styles.stepperBtn, { backgroundColor: t.accent }]}
            >
              <Ionicons name="add" size={22} color={t.accentText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live totals for the selected serving */}
        <View
          style={[
            styles.card,
            { backgroundColor: t.cardBg, borderColor: t.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: t.text }]}>
            Selected Serving
          </Text>
          <Text style={[styles.selectedLabel, { color: t.secondary }]}>
            {selectedLabel}
          </Text>
          <View style={styles.macroGrid}>
            {(
              [
                ["Calories", round(totals.calories), ""],
                ["Protein", round(totals.proteinG), "g"],
                ["Carbs", round(totals.carbsG), "g"],
                ["Fat", round(totals.fatG), "g"],
              ] as const
            ).map(([label, value, suffix]) => (
              <View key={label} style={styles.macroCell}>
                <Text style={[styles.macroLabel, { color: t.secondary }]}>
                  {label}
                </Text>
                <Text style={[styles.macroValue, { color: t.text }]}>
                  {value}
                  {suffix}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
    paddingTop: 18,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerPill: {
    minWidth: 68,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  headerPillText: { fontSize: 15, fontWeight: "600" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  productName: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  productBrand: { fontSize: 14, marginTop: 4 },
  productHelper: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  sectionHelper: { fontSize: 13, lineHeight: 18, marginTop: 6 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  optionCardSelected: { borderWidth: 1.5 },
  optionInfo: { flex: 1, paddingRight: 10 },
  optionTitle: { fontSize: 16, fontWeight: "600" },
  optionSubtitle: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  amountInput: { flex: 1, fontSize: 16, fontWeight: "600", paddingVertical: 0 },
  unitToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 12,
  },
  unitToggleText: { fontSize: 15, fontWeight: "600" },
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
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 8,
    marginTop: 12,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 60,
    textAlign: "center",
    paddingVertical: 0,
  },
  selectedLabel: { fontSize: 14, marginTop: 4 },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    rowGap: 14,
  },
  macroCell: { width: "25%" },
  macroLabel: { fontSize: 13 },
  macroValue: { fontSize: 17, fontWeight: "700", marginTop: 2 },
});
