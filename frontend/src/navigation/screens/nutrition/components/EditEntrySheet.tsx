import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Linking,
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
}: {
  entry: FoodLogEntry | null;
  visible: boolean;
  onClose: () => void;
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
      setUnitPickerOpen(false);
      setMealPickerOpen(false);
      setSaving(false);
    }
  }, [entry]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) return null;

  const qty = parseFloat(quantityText) || 0;
  const grams = qty * gramsFor(unitKey);
  const consumed = {
    calories: perGram.calories * grams,
    proteinG: perGram.proteinG * grams,
    carbsG: perGram.carbsG * grams,
    fatG: perGram.fatG * grams,
  };

  const pctOfGoal = (value: number, g?: number) =>
    g && g > 0 ? Math.round((value / g) * 100) : 0;

  // Switching units keeps the actual amount (grams) constant.
  const changeUnit = (nextKey: MeasureUnitKey) => {
    const currentGrams = qty * gramsFor(unitKey);
    const nextQty = currentGrams / gramsFor(nextKey);
    setUnitKey(nextKey);
    setQuantityText(String(round2(nextQty)));
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
      if (entry.foodId) {
        await updateLog(
          entry.entryId,
          {
            foodId: entry.foodId,
            category,
            quantity: backendQty,
            unit: backendUnit,
          },
          unitMeta,
        );
      } else {
        await updateLog(
          entry.entryId,
          {
            category,
            quantity: backendQty,
            unit: backendUnit,
            description: entry.description,
            calories: consumed.calories,
            proteinG: consumed.proteinG,
            carbsG: consumed.carbsG,
            fatG: consumed.fatG,
          },
          unitMeta,
        );
      }
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
          {entry.description}
        </Text>

          {/* AI provenance — shown for entries logged via the AI Smart Journal */}
          {entry.sourceType?.startsWith("AI") && (
            <View style={styles.sourceRow}>
              <View style={[styles.aiChip, { backgroundColor: t.surface }]}>
                <Text style={[styles.aiChipText, { color: t.secondary }]}>
                  AI estimated
                </Text>
              </View>
              {entry.sourceUrl ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(entry.sourceUrl!)}
                >
                  <Text
                    style={[styles.sourceLink, { color: t.accent }]}
                    numberOfLines={1}
                  >
                    Source
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

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
              onChangeText={setQuantityText}
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

          {/* Macro summary — percentages are share of the daily goal */}
          <View style={[styles.macroRow, { borderTopColor: t.separator }]}>
            <MacroRing
              label="cal"
              value={round(consumed.calories)}
              goal={goal?.calorieGoal ?? 0}
              size={92}
            />
            <View style={styles.macroStats}>
              <MacroStat
                label="Carbs"
                grams={round1(consumed.carbsG)}
                pct={pctOfGoal(consumed.carbsG, goal?.carbsG)}
                t={t}
              />
              <MacroStat
                label="Fat"
                grams={round1(consumed.fatG)}
                pct={pctOfGoal(consumed.fatG, goal?.fatG)}
                t={t}
              />
              <MacroStat
                label="Protein"
                grams={round1(consumed.proteinG)}
                pct={pctOfGoal(consumed.proteinG, goal?.proteinG)}
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
      </Pressable>
    </BottomSheet>
  );
}

function MacroStat({
  label,
  grams,
  pct,
  t,
}: {
  label: string;
  grams: number;
  pct: number;
  t: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statPct, { color: t.secondary }]}>{pct}%</Text>
      <Text style={[styles.statGrams, { color: t.text }]}>{grams} g</Text>
      <Text style={[styles.statLabel, { color: t.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  aiChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiChipText: { fontSize: 12, fontWeight: "600" },
  sourceLink: { fontSize: 13, fontWeight: "600" },
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
  statGrams: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  statLabel: { fontSize: 12, marginTop: 4 },
  saveBtn: {
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
});
