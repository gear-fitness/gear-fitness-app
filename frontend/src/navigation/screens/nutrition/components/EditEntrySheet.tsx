import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { useNutrition } from "../../../../context/NutritionContext";
import { FoodLogEntry } from "../../../../api/types";
import { MacroRing } from "./MacroRing";

const round = (n: number | null | undefined) => Math.round(n ?? 0);
const round1 = (n: number | null | undefined) =>
  Math.round((n ?? 0) * 10) / 10;

/**
 * Bottom sheet to edit a logged food entry: change the number of servings, move
 * it to a different meal category, and see the resulting macros as a percentage
 * of the user's daily goals. The backend has no update endpoint, so saving
 * re-logs the entry (via NutritionContext.updateLog) with the new values.
 *
 * Macros scale linearly with quantity, so we derive the per-unit amounts from
 * the entry itself rather than re-fetching the food — keeping the live preview
 * exactly in step with what the server will recompute on save.
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
  const { categories, summary, updateLog } = useNutrition();
  const goal = summary?.goal;

  const [quantityText, setQuantityText] = useState("1");
  const [category, setCategory] = useState("");
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Re-seed local state each time a different entry is opened.
  useEffect(() => {
    if (entry) {
      setQuantityText(String(entry.quantity));
      setCategory(entry.category ?? categories[0] ?? "Breakfast");
      setMealPickerOpen(false);
      setSaving(false);
    }
  }, [entry]); // eslint-disable-line react-hooks/exhaustive-deps

  const perUnit = useMemo(() => {
    const q = entry && entry.quantity ? entry.quantity : 1;
    return {
      calories: (entry?.calories ?? 0) / q,
      proteinG: (entry?.proteinG ?? 0) / q,
      carbsG: (entry?.carbsG ?? 0) / q,
      fatG: (entry?.fatG ?? 0) / q,
    };
  }, [entry]);

  if (!entry) return null;

  const unit = entry.unit;
  const qty = parseFloat(quantityText) || 0;
  const consumed = {
    calories: perUnit.calories * qty,
    proteinG: perUnit.proteinG * qty,
    carbsG: perUnit.carbsG * qty,
    fatG: perUnit.fatG * qty,
  };

  const pctOfGoal = (value: number, g?: number) =>
    g && g > 0 ? Math.round((value / g) * 100) : 0;

  const handleSave = async () => {
    if (qty <= 0 || saving) return;
    setSaving(true);
    try {
      if (entry.foodId) {
        await updateLog(entry.entryId, {
          foodId: entry.foodId,
          category,
          quantity: qty,
          unit,
        });
      } else {
        // Quick-add entry: re-log a scaled macro snapshot.
        await updateLog(entry.entryId, {
          category,
          quantity: qty,
          unit,
          description: entry.description,
          calories: consumed.calories,
          proteinG: consumed.proteinG,
          carbsG: consumed.carbsG,
          fatG: consumed.fatG,
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to update entry:", err);
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: t.cardBg, borderColor: t.cardBorder },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: t.handle }]} />

          <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
            {entry.description}
          </Text>

          {/* Serving size (display) */}
          <View style={[styles.row, { borderTopColor: t.separator }]}>
            <Text style={[styles.rowLabel, { color: t.text }]}>
              Serving Size
            </Text>
            <View style={[styles.pill, { backgroundColor: t.surface }]}>
              <Text style={[styles.pillText, { color: t.text }]}>
                {unit === "GRAM" ? "Grams" : "1 serving"}
              </Text>
            </View>
          </View>

          {/* Number of servings (editable) */}
          <View style={[styles.row, { borderTopColor: t.separator }]}>
            <Text style={[styles.rowLabel, { color: t.text }]}>
              {unit === "GRAM" ? "Amount (g)" : "Number of Servings"}
            </Text>
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

          {/* Meal category (movable) */}
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
      </Pressable>
    </Modal>
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
