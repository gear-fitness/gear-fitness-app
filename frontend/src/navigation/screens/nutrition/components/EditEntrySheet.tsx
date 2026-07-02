import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { useNutrition } from "../../../../context/NutritionContext";
import { FoodLogEntry, MeasureUnit, MeasureUnitKey } from "../../../../api/types";
import { buildUnits, gramsPerUnit, unitLabel } from "../../../../utils/nutritionUnits";
import { BottomSheet } from "../../../../components/BottomSheet";
import { MacroRing } from "./MacroRing";

const round = (n: number | null | undefined) => Math.round(n ?? 0);
const round1 = (n: number | null | undefined) =>
  Math.round((n ?? 0) * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Bottom sheet to edit a logged food entry: change the serving size (unit) and
 * quantity, move it to a different meal category, and see the resulting macros
 * as a percentage of the user's daily goals. The backend has no update endpoint
 * and only stores SERVING/GRAM, so saving re-logs the entry (converting the
 * chosen unit to grams) and persists the display unit as client-side metadata.
 *
 * Macros scale linearly with grams, so we derive a per-gram basis from the
 * entry itself, keeping the live preview in step with what the server stores.
 */
export function EditEntrySheet({
  entry,
  visible,
  onClose,
  onSaved,
  onRecalculate,
  onDelete,
  titleText,
}: {
  entry: FoodLogEntry | null;
  visible: boolean;
  onClose: () => void;
  /** Fired after a successful save with the freshly re-logged entry, so a
   *  caller (the Smart Journal) can keep its own cached copy in sync. */
  onSaved?: (entry: FoodLogEntry | null) => void;
  /** When provided (AI Smart Journal entries), shows a "Recalculate"
   *  action that re-parses the food instead of hand-editing it. */
  onRecalculate?: () => void;
  /** When provided (manual entries), shows a "Delete" action that removes the
   *  logged food. The caller performs the delete and closes the sheet. */
  onDelete?: () => void;
  /** Heading to show instead of the entry's parsed description — the Smart
   *  Journal passes the exact text the user typed for that line. */
  titleText?: string;
}) {
  const t = useThemeColors();
  const { categories, summary, updateLog, getEntryUnitMeta } = useNutrition();
  const goal = summary?.goal;

  const meta = entry ? getEntryUnitMeta(entry.entryId) : undefined;
  const servingGrams = meta?.servingGrams ?? 100;

  // Units offered when editing: serving, g, oz, plus volume units (cup, ml).
  const unitOptions: MeasureUnit[] = useMemo(
    () => buildUnits(servingGrams, { includeVolume: true }),
    [servingGrams],
  );

  const gramsFor = (key: MeasureUnitKey) =>
    gramsPerUnit(key, servingGrams, unitOptions);

  const [unitKey, setUnitKey] = useState<MeasureUnitKey>("serving");
  const [quantityText, setQuantityText] = useState("1");
  const [category, setCategory] = useState("");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable macros + calories. Seeded from the entry, re-derived when the
  // serving size/quantity changes, or hand-edited by the user. Editing a macro
  // rescales calories (4/4/9); calories can also be typed directly. Once any of
  // these is hand-edited, the entry saves as a custom quick-add so the override
  // persists (a food-linked entry would have its macros recomputed server-side).
  const [proteinText, setProteinText] = useState("0");
  const [carbsText, setCarbsText] = useState("0");
  const [fatText, setFatText] = useState("0");
  const [caloriesText, setCaloriesText] = useState("0");
  const [nutritionEdited, setNutritionEdited] = useState(false);

  const caloriesFor = (proteinG: number, carbsG: number, fatG: number) =>
    Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);

  // Per-gram macros derived from the entry's stored (consumed) amounts.
  const perGram = useMemo(() => {
    if (!entry) return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    const grams =
      entry.unit === "GRAM"
        ? entry.quantity
        : entry.quantity * servingGrams;
    const div = grams > 0 ? grams : 1;
    return {
      calories: (entry.calories ?? 0) / div,
      proteinG: (entry.proteinG ?? 0) / div,
      carbsG: (entry.carbsG ?? 0) / div,
      fatG: (entry.fatG ?? 0) / div,
    };
  }, [entry, servingGrams]);

  // Re-seed local state each time a different entry is opened.
  useEffect(() => {
    if (entry) {
      const startUnit: MeasureUnitKey =
        meta?.unitKey ?? (entry.unit === "GRAM" ? "g" : "serving");
      setUnitKey(startUnit);
      setQuantityText(String(meta?.quantity ?? entry.quantity));
      setCategory(entry.category ?? categories[0] ?? "Breakfast");
      setProteinText(String(round1(entry.proteinG)));
      setCarbsText(String(round1(entry.carbsG)));
      setFatText(String(round1(entry.fatG)));
      setCaloriesText(String(round(entry.calories)));
      setNutritionEdited(false);
      setUnitPickerOpen(false);
      setMealPickerOpen(false);
      setSaving(false);
    }
  }, [entry]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) return null;

  const qty = parseFloat(quantityText) || 0;
  const grams = qty * gramsFor(unitKey);

  // Current macro grams and calories from the editable fields.
  const macros = {
    proteinG: parseFloat(proteinText) || 0,
    carbsG: parseFloat(carbsText) || 0,
    fatG: parseFloat(fatText) || 0,
  };
  const calories = parseFloat(caloriesText) || 0;

  const pctOfGoal = (value: number, g?: number) =>
    g && g > 0 ? Math.round((value / g) * 100) : 0;

  // Re-derive the macro fields (and calories) from the entry's per-gram basis
  // for a given amount (used when the serving size/quantity changes).
  const reseedMacros = (nextQty: number, nextKey: MeasureUnitKey) => {
    const g = nextQty * gramsFor(nextKey);
    const p = round1(perGram.proteinG * g);
    const c = round1(perGram.carbsG * g);
    const f = round1(perGram.fatG * g);
    setProteinText(String(p));
    setCarbsText(String(c));
    setFatText(String(f));
    setCaloriesText(String(caloriesFor(p, c, f)));
    setNutritionEdited(false);
  };

  // Edit one macro: keep the others, rescale calories to match (4/4/9).
  const editMacro = (
    which: "proteinG" | "carbsG" | "fatG",
    text: string,
  ) => {
    const next = { ...macros, [which]: parseFloat(text) || 0 };
    if (which === "proteinG") setProteinText(text);
    else if (which === "carbsG") setCarbsText(text);
    else setFatText(text);
    setCaloriesText(String(caloriesFor(next.proteinG, next.carbsG, next.fatG)));
    setNutritionEdited(true);
  };

  const editCalories = (text: string) => {
    setCaloriesText(text);
    setNutritionEdited(true);
  };

  const changeQuantity = (text: string) => {
    setQuantityText(text);
    reseedMacros(parseFloat(text) || 0, unitKey);
  };

  // Switching units keeps the actual amount (grams) constant.
  const changeUnit = (nextKey: MeasureUnitKey) => {
    const currentGrams = qty * gramsFor(unitKey);
    const nextQty = currentGrams / gramsFor(nextKey);
    setUnitKey(nextKey);
    setQuantityText(String(round2(nextQty)));
    reseedMacros(nextQty, nextKey);
    setUnitPickerOpen(false);
  };

  const handleSave = async () => {
    if (qty <= 0 || saving) return;
    setSaving(true);
    const unitMeta = {
      unitKey,
      quantity: qty,
      servingGrams,
      units: meta?.units,
    };
    // The backend understands SERVING/GRAM only — log servings as-is, anything
    // else as its gram equivalent so macros recompute correctly.
    const backendUnit = unitKey === "serving" ? "SERVING" : "GRAM";
    const backendQty = unitKey === "serving" ? qty : grams;
    try {
      let created: FoodLogEntry | null = null;
      // A food-linked entry recomputes its macros server-side, so it can only
      // keep the foodId path while its nutrition is untouched. Once the user
      // overrides a macro or the calories, re-log it as a custom quick-add with
      // the exact values.
      if (entry.foodId && !nutritionEdited) {
        created = await updateLog(
          entry.entryId,
          {
            foodId: entry.foodId,
            category,
            quantity: backendQty,
            unit: backendUnit,
            sourceType: entry.sourceType,
            sourceUrl: entry.sourceUrl,
          },
          unitMeta,
        );
      } else {
        created = await updateLog(
          entry.entryId,
          {
            category,
            quantity: backendQty,
            unit: backendUnit,
            description: entry.description,
            calories,
            proteinG: macros.proteinG,
            carbsG: macros.carbsG,
            fatG: macros.fatG,
            sourceType: entry.sourceType,
            sourceUrl: entry.sourceUrl,
          },
          unitMeta,
        );
      }
      onSaved?.(created);
      onClose();
    } catch (err) {
      console.error("Failed to update entry:", err);
      setSaving(false);
    }
  };

  const qtyLabel =
    unitKey === "serving" ? "Number of Servings" : `Amount (${unitLabel(unitKey)})`;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      backdropOpacity={0}
      keyboardDismiss
    >
      <Pressable style={styles.content} onPress={() => Keyboard.dismiss()}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
          {titleText ?? entry.description}
        </Text>

          {/* Serving size — unit selector */}
          <View style={[styles.row, { borderTopColor: t.separator }]}>
            <Text style={[styles.rowLabel, { color: t.text }]}>
              Serving Size
            </Text>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: t.surface }]}
              onPress={() => setUnitPickerOpen((o) => !o)}
            >
              <Text style={[styles.pillText, { color: t.text }]}>
                {unitLabel(unitKey)}
              </Text>
            </TouchableOpacity>
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
                    onPress={() => changeUnit(u.key)}
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

          {/* Quantity */}
          <View style={[styles.row, { borderTopColor: t.separator }]}>
            <Text style={[styles.rowLabel, { color: t.text }]}>{qtyLabel}</Text>
            <TextInput
              value={quantityText}
              onChangeText={changeQuantity}
              keyboardType="decimal-pad"
              selectTextOnFocus
              style={[
                styles.qtyInput,
                { color: t.text, borderColor: t.border },
              ]}
            />
          </View>

          {/* Meal category */}
          <View style={[styles.row, { borderTopColor: t.separator }]}>
            <Text style={[styles.rowLabel, { color: t.text }]}>Meal</Text>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: t.surface }]}
              onPress={() => setMealPickerOpen((o) => !o)}
            >
              <Text style={[styles.pillText, { color: t.text }]}>
                {category}
              </Text>
            </TouchableOpacity>
          </View>

          {mealPickerOpen && (
            <View style={styles.chipRow}>
              {categories.map((name) => {
                const selected = name === category;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? t.accent : t.surface,
                        borderColor: t.cardBorder,
                      },
                    ]}
                    onPress={() => {
                      setCategory(name);
                      setMealPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? t.accentText : t.text },
                      ]}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Macro summary — tap any number to edit it. Editing a macro
              rescales calories (4/4/9); calories can also be set directly.
              Percentages are the share of the daily goal. */}
          <View style={[styles.macroRow, { borderTopColor: t.separator }]}>
            <MacroRing
              label="cal"
              value={round(calories)}
              valueText={caloriesText}
              onChangeText={editCalories}
              goal={goal?.calorieGoal ?? 0}
              size={92}
            />
            <View style={styles.macroStats}>
              <MacroStat
                label="Carbs"
                value={carbsText}
                onChangeText={(v) => editMacro("carbsG", v)}
                pct={pctOfGoal(macros.carbsG, goal?.carbsG)}
                t={t}
              />
              <MacroStat
                label="Fat"
                value={fatText}
                onChangeText={(v) => editMacro("fatG", v)}
                pct={pctOfGoal(macros.fatG, goal?.fatG)}
                t={t}
              />
              <MacroStat
                label="Protein"
                value={proteinText}
                onChangeText={(v) => editMacro("proteinG", v)}
                pct={pctOfGoal(macros.proteinG, goal?.proteinG)}
                t={t}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: t.accent }]}
            disabled={qty <= 0 || saving}
            onPress={handleSave}
          >
            <Text style={[styles.saveBtnText, { color: t.accentText }]}>
              {saving ? "Saving…" : "Save changes"}
            </Text>
          </TouchableOpacity>

          {onRecalculate && (
            <TouchableOpacity
              style={[styles.recalcBtn, { borderColor: t.border }]}
              disabled={saving}
              onPress={() => {
                onRecalculate();
                onClose();
              }}
            >
              <Text style={[styles.recalcBtnText, { color: t.text }]}>
                Recalculate
              </Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              disabled={saving}
              onPress={onDelete}
            >
              <Text style={[styles.deleteBtnText, { color: t.danger }]}>
                Delete entry
              </Text>
            </TouchableOpacity>
          )}
      </Pressable>
    </BottomSheet>
  );
}

function MacroStat({
  label,
  value,
  onChangeText,
  pct,
  t,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  pct: number;
  t: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statPct, { color: t.secondary }]}>{pct}%</Text>
      <View style={[styles.statInputRow, { borderColor: t.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={[styles.statInput, { color: t.text }]}
        />
        <Text style={[styles.statUnit, { color: t.text }]}>g</Text>
      </View>
      <Text style={[styles.statLabel, { color: t.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  rowLabel: { fontSize: 16 },
  pill: {
    minWidth: 110,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  pillText: { fontSize: 16, fontWeight: "600" },
  qtyInput: {
    minWidth: 110,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    textAlign: "right",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 6,
  },
  chip: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 14, fontWeight: "500" },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
    marginTop: 6,
  },
  macroStats: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: { alignItems: "center" },
  statPct: { fontSize: 14, fontWeight: "600" },
  statInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 2,
  },
  statInput: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 30,
    paddingVertical: 0,
    textAlign: "center",
  },
  statUnit: { fontSize: 13, fontWeight: "600", marginLeft: 2, marginBottom: 1 },
  statLabel: { fontSize: 12, marginTop: 4 },
  saveBtn: {
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
  recalcBtn: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  recalcBtnText: { fontSize: 16, fontWeight: "600" },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteBtnText: { fontSize: 16, fontWeight: "600" },
});
