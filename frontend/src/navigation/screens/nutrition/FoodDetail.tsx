import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StackActions,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { useNutrition } from "../../../context/NutritionContext";
import { FoodItem, MealType, ServingUnit } from "../../../api/types";

const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snacks",
};

const round = (n: number) => Math.round(n);

export function FoodDetail() {
  const t = useThemeColors();
  const navigation = useNavigation<any>();
  const { food, mealType } = useRoute<any>().params as {
    food: FoodItem;
    mealType: MealType;
  };
  const { addLog } = useNutrition();

  const [unit, setUnit] = useState<ServingUnit>("SERVING");
  const [quantityText, setQuantityText] = useState("1");
  const [saving, setSaving] = useState(false);

  const quantity = parseFloat(quantityText) || 0;
  const servingGrams = food.servingSize ?? 100;

  // Resolve grams consumed, then scale the per-100g nutrients.
  const factor = useMemo(() => {
    const grams = unit === "GRAM" ? quantity : quantity * servingGrams;
    return grams / 100;
  }, [unit, quantity, servingGrams]);

  const macro = (per100: number | null) =>
    per100 == null ? 0 : per100 * factor;

  const servingDescription =
    food.householdServing ||
    (food.servingSize
      ? `${food.servingSize}${food.servingUnit ?? "g"}`
      : "100g");

  const handleAdd = async () => {
    if (quantity <= 0 || saving) return;
    setSaving(true);
    try {
      await addLog({ foodId: food.foodId, mealType, quantity, unit });
      // Dismiss both the detail and the search modal back to the day view.
      navigation.dispatch(StackActions.pop(2));
    } catch (err) {
      console.error("Failed to log food:", err);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
      <View style={styles.header}>
        <Text style={[styles.meal, { color: t.secondary }]}>
          Add to {MEAL_LABEL[mealType]}
        </Text>
        <Text style={[styles.title, { color: t.text }]}>
          {food.description}
        </Text>
        {food.brandOwner ? (
          <Text style={[styles.brand, { color: t.secondary }]}>
            {food.brandOwner}
          </Text>
        ) : null}
      </View>

      {/* Unit toggle */}
      <View style={[styles.toggle, { backgroundColor: t.unitToggleBg }]}>
        {(["SERVING", "GRAM"] as ServingUnit[]).map((u) => (
          <TouchableOpacity
            key={u}
            style={[
              styles.toggleBtn,
              unit === u && { backgroundColor: t.unitBtnActiveBg },
            ]}
            onPress={() => {
              setUnit(u);
              setQuantityText(u === "GRAM" ? "100" : "1");
            }}
          >
            <Text
              style={[
                styles.toggleText,
                { color: unit === u ? t.text : t.secondary },
              ]}
            >
              {u === "SERVING" ? `Serving (${servingDescription})` : "Grams"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quantity */}
      <View style={[styles.qtyRow, { borderColor: t.cardBorder }]}>
        <Text style={[styles.qtyLabel, { color: t.text }]}>
          {unit === "GRAM" ? "Grams" : "Servings"}
        </Text>
        <TextInput
          value={quantityText}
          onChangeText={setQuantityText}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={[styles.qtyInput, { color: t.text, borderColor: t.border }]}
        />
      </View>

      {/* Macro preview */}
      <View
        style={[
          styles.preview,
          { backgroundColor: t.cardBg, borderColor: t.cardBorder },
        ]}
      >
        <MacroStat label="Calories" value={round(macro(food.calories))} t={t} />
        <MacroStat label="Protein" value={round(macro(food.proteinG))} unit="g" t={t} />
        <MacroStat label="Carbs" value={round(macro(food.carbsG))} unit="g" t={t} />
        <MacroStat label="Fat" value={round(macro(food.fatG))} unit="g" t={t} />
      </View>

      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: t.accent }]}
        disabled={quantity <= 0 || saving}
        onPress={handleAdd}
      >
        <Text style={[styles.addBtnText, { color: t.accentText }]}>
          {saving ? "Adding…" : "Add to log"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function MacroStat({
  label,
  value,
  unit,
  t,
}: {
  label: string;
  value: number;
  unit?: string;
  t: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: t.text }]}>
        {value}
        {unit ?? ""}
      </Text>
      <Text style={[styles.statLabel, { color: t.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { paddingTop: 16, paddingBottom: 20 },
  meal: { fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: "700", marginTop: 6 },
  brand: { fontSize: 14, marginTop: 4 },
  toggle: { flexDirection: "row", borderRadius: 10, padding: 3 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleText: { fontSize: 14, fontWeight: "500" },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },
  qtyLabel: { fontSize: 16 },
  qtyInput: {
    minWidth: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    textAlign: "right",
  },
  preview: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    marginTop: 24,
  },
  stat: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 4 },
  addBtn: {
    marginTop: "auto",
    marginBottom: 24,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  addBtnText: { fontSize: 16, fontWeight: "600" },
});
