import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Text, TextInput } from "../../../../components/Text";
import {
  Host,
  Menu,
  Button,
  HStack,
  Spacer,
  Text as SwiftText,
} from "@expo/ui/swift-ui";
import { font, foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { useNutrition } from "../../../../context/NutritionContext";
import {
  FoodLogEntry,
  MeasureUnit,
  MeasureUnitKey,
} from "../../../../api/types";
import {
  buildUnits,
  gramsPerUnit,
  unitLabel,
} from "../../../../utils/nutritionUnits";
import { BottomSheet } from "../../../../components/BottomSheet";
import { MacroRing } from "./MacroRing";
import { macroColor } from "./macroColors";

type Theme = ReturnType<typeof useThemeColors>;

const round = (n: number | null | undefined) => Math.round(n ?? 0);
const round1 = (n: number | null | undefined) => Math.round((n ?? 0) * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Bottom sheet to edit a logged food entry: change the serving size (unit) and
 * quantity, and see the resulting macros as a percentage of the user's daily
 * goals. The backend has no update endpoint
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
  /** Fired after a successful save with the freshly re-logged entry, so the
   *  food journal can keep its own cached copy in sync. */
  onSaved?: (entry: FoodLogEntry | null) => void;
  /** When provided (AI journal lines), shows a "Recalculate" action that
   *  re-parses the food instead of hand-editing it. */
  onRecalculate?: () => void;
  /** When provided (database lines), shows a "Delete" action that removes the
   *  logged food. The caller performs the delete and closes the sheet. */
  onDelete?: () => void;
  /** Heading to show instead of the entry's parsed description — the food
   *  journal passes the exact text of that line. */
  titleText?: string;
}) {
  const t = useThemeColors();
  const { summary, updateLog, getEntryUnitMeta } = useNutrition();
  const goal = summary?.goal;

  // The content (~520-560pt) is taller than a small screen once the keyboard is
  // up, so cap it to a slice of the window and let it scroll. Read live so it
  // stays correct across rotation / split view.
  const { height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = windowHeight * 0.82;

  // Retain the last non-null entry (and heading) through BottomSheet's close
  // animation: callers close the sheet by nulling the entry, so without this
  // the whole Modal would unmount instantly and the slide-down never plays.
  const lastEntryRef = useRef<FoodLogEntry | null>(null);
  if (entry) lastEntryRef.current = entry;
  const shownEntry = entry ?? lastEntryRef.current;

  // Hold the heading text alongside the entry. Storing it on every render where
  // `entry` is non-null (even when undefined) keeps an entry from leaking a
  // stale journal-line title, while preserving the last value while closing.
  const lastTitleRef = useRef<string | undefined>(undefined);
  if (entry) lastTitleRef.current = titleText;
  const shownTitle = lastTitleRef.current;

  const meta = shownEntry ? getEntryUnitMeta(shownEntry.entryId) : undefined;
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
    if (!shownEntry) return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    const grams =
      shownEntry.unit === "GRAM"
        ? shownEntry.quantity
        : shownEntry.quantity * servingGrams;
    const div = grams > 0 ? grams : 1;
    return {
      calories: (shownEntry.calories ?? 0) / div,
      proteinG: (shownEntry.proteinG ?? 0) / div,
      carbsG: (shownEntry.carbsG ?? 0) / div,
      fatG: (shownEntry.fatG ?? 0) / div,
    };
  }, [shownEntry, servingGrams]);

  // Re-seed local state each time a different entry is opened.
  useEffect(() => {
    if (entry) {
      const startUnit: MeasureUnitKey =
        meta?.unitKey ?? (entry.unit === "GRAM" ? "g" : "serving");
      setUnitKey(startUnit);
      setQuantityText(String(meta?.quantity ?? entry.quantity));
      setProteinText(String(round1(entry.proteinG)));
      setCarbsText(String(round1(entry.carbsG)));
      setFatText(String(round1(entry.fatG)));
      setCaloriesText(String(round(entry.calories)));
      setNutritionEdited(false);
      setSaving(false);
    }
  }, [entry]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shownEntry) return null;

  const qty = parseFloat(quantityText) || 0;
  const grams = qty * gramsFor(unitKey);

  // Current macro grams and calories from the editable fields.
  const macros = {
    proteinG: parseFloat(proteinText) || 0,
    carbsG: parseFloat(carbsText) || 0,
    fatG: parseFloat(fatText) || 0,
  };
  const calories = parseFloat(caloriesText) || 0;

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
  const editMacro = (which: "proteinG" | "carbsG" | "fatG", text: string) => {
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

  // Whole servings step by 1; weight/volume units by a coarser amount so the
  // buttons aren't tedious. Never steps below one step (0 would disable save).
  const qtyStep = unitKey === "serving" ? 1 : 5;
  const stepQuantity = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    const next = round2(
      Math.max(qtyStep, (parseFloat(quantityText) || 0) + delta),
    );
    changeQuantity(String(next));
  };

  // Switching units keeps the actual amount (grams) constant.
  const changeUnit = (nextKey: MeasureUnitKey) => {
    const currentGrams = qty * gramsFor(unitKey);
    const nextQty = currentGrams / gramsFor(nextKey);
    setUnitKey(nextKey);
    setQuantityText(String(round2(nextQty)));
    reseedMacros(nextQty, nextKey);
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
    // A food-linked entry recomputes its macros server-side, so it can only
    // keep the foodId path while its nutrition is untouched. Once the user
    // overrides a macro or the calories, re-log it as a custom quick-add with
    // the exact values.
    const nutrition =
      shownEntry.foodId && !nutritionEdited
        ? { foodId: shownEntry.foodId }
        : {
            description: shownEntry.description,
            calories,
            proteinG: macros.proteinG,
            carbsG: macros.carbsG,
            fatG: macros.fatG,
          };
    try {
      const created = await updateLog(
        shownEntry.entryId,
        {
          category: shownEntry.category ?? undefined,
          quantity: backendQty,
          unit: backendUnit,
          sourceType: shownEntry.sourceType,
          sourceUrl: shownEntry.sourceUrl,
          ...nutrition,
        },
        unitMeta,
      );
      onSaved?.(created);
      onClose();
    } catch (err) {
      console.error("Failed to update entry:", err);
      setSaving(false);
    }
  };

  const qtyLabel =
    unitKey === "serving" ? "Servings" : `Amount (${unitLabel(unitKey)})`;

  const glassAvailable = isLiquidGlassAvailable();

  return (
    // avoidKeyboard lifts the whole sheet in sync with the keyboard, so the
    // quantity field (low in the sheet) isn't covered while editing; the
    // ScrollView cap keeps the top reachable on small screens.
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      keyboardDismiss
    >
      <ScrollView
        style={{ maxHeight: sheetMaxHeight }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.content} onPress={() => Keyboard.dismiss()}>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
            {shownTitle ?? shownEntry.description}
          </Text>

          {/* Macros + calories — at the top. Tap any number to edit it: editing
            a macro rescales calories (4/4/9); calories can also be set
            directly. */}
          <GlassCard glass={glassAvailable} t={t}>
            <View style={styles.macroRow}>
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
                  labelColor={macroColor("carbs", t.isDark)}
                  value={carbsText}
                  onChangeText={(v) => editMacro("carbsG", v)}
                  t={t}
                />
                <MacroStat
                  label="Protein"
                  labelColor={macroColor("protein", t.isDark)}
                  value={proteinText}
                  onChangeText={(v) => editMacro("proteinG", v)}
                  t={t}
                />
                <MacroStat
                  label="Fat"
                  labelColor={macroColor("fat", t.isDark)}
                  value={fatText}
                  onChangeText={(v) => editMacro("fatG", v)}
                  t={t}
                />
              </View>
            </View>
          </GlassCard>

          {/* Serving size and quantity — at the bottom. Serving size is a
            dropdown row; quantity is a +/- stepper. */}
          <GlassCard glass={glassAvailable} t={t}>
            <SelectRow
              label="Serving Size"
              valueKey={unitKey}
              valueLabel={unitLabel(unitKey)}
              options={unitOptions.map((u) => ({ key: u.key, label: u.label }))}
              onSelect={(key) => changeUnit(key as MeasureUnitKey)}
              isFirst
              t={t}
            />

            <View style={[styles.row, separatorStyle(t)]}>
              <Text style={[styles.rowLabel, { color: t.text }]}>
                {qtyLabel}
              </Text>
              <View style={styles.stepper}>
                <StepButton
                  icon="remove"
                  onPress={() => stepQuantity(-qtyStep)}
                  disabled={qty <= qtyStep}
                  glass={glassAvailable}
                  t={t}
                />
                <TextInput
                  value={quantityText}
                  onChangeText={changeQuantity}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={t.secondary}
                  maxLength={6}
                  selectTextOnFocus
                  accessibilityLabel="Quantity"
                  style={[styles.stepValue, { color: t.text }]}
                />
                <StepButton
                  icon="add"
                  onPress={() => stepQuantity(qtyStep)}
                  glass={glassAvailable}
                  t={t}
                />
              </View>
            </View>
          </GlassCard>

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
              <Text style={[styles.recalcBtnText, { color: t.tint }]}>
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
      </ScrollView>
    </BottomSheet>
  );
}

function MacroStat({
  label,
  labelColor,
  value,
  onChangeText,
  t,
}: {
  label: string;
  /** Macro identity color for the label word (shared macroColors). */
  labelColor: string;
  value: string;
  onChangeText: (v: string) => void;
  t: Theme;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statInputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={[styles.statInput, { color: t.text }]}
        />
        <Text style={[styles.statUnit, { color: t.text }]}>g</Text>
      </View>
      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

/**
 * A round +/- stepper button: a translucent glass circle where liquid glass is
 * available (matching the sheet's glass cards), a hairline-bordered circle
 * otherwise.
 */
function StepButton({
  icon,
  onPress,
  disabled,
  glass,
  t,
}: {
  icon: "add" | "remove";
  onPress: () => void;
  disabled?: boolean;
  glass: boolean;
  t: Theme;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.stepBtn,
        !glass && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.border,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {glass && (
        <GlassView style={styles.stepGlass} glassEffectStyle="regular" />
      )}
      <Ionicons name={icon} size={20} color={disabled ? t.secondary : t.text} />
    </TouchableOpacity>
  );
}

/**
 * A rounded card matching the calorie tracker's glass summary card: a
 * translucent GlassView fill where liquid glass is available, falling back to a
 * plain surface card otherwise.
 */
function GlassCard({
  glass,
  t,
  children,
}: {
  glass: boolean;
  t: Theme;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: glass ? "transparent" : t.cardBg,
          borderColor: glass ? "transparent" : t.cardBorder,
        },
      ]}
    >
      {glass && (
        <GlassView
          style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
          glassEffectStyle="regular"
        />
      )}
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
}

/**
 * A row that lets the user pick from a list of options. Used for both Serving
 * Size and Meal so they read and behave identically: a plain-text label on the
 * left and the current value on the right; tapping the row drops a native menu
 * with a checkmark on the active option (Android falls back to an Alert list —
 * SwiftUI is iOS-only).
 *
 * On iOS the whole row (label + spacer + value) is the SwiftUI Menu's own
 * label, so tapping anywhere opens the anchored dropdown. `ignoreSafeArea` on
 * the Host is load-bearing: a UIHostingController insets its SwiftUI content
 * away from the screen's safe areas, and these rows sit inside the home
 * indicator's bottom inset — without the prop the text gets pushed to the top
 * of the row (intermittently, since the inset depends on where the sheet is
 * mid-animation when the host lays out).
 */
function SelectRow({
  label,
  valueKey,
  valueLabel,
  options,
  onSelect,
  isFirst,
  t,
}: {
  label: string;
  valueKey: string;
  valueLabel: string;
  options: { key: string; label: string }[];
  onSelect: (key: string) => void;
  isFirst?: boolean;
  t: Theme;
}) {
  const rowStyle = [styles.row, !isFirst && separatorStyle(t)];

  if (Platform.OS !== "ios") {
    return (
      <TouchableOpacity
        style={rowStyle}
        activeOpacity={0.7}
        onPress={() =>
          Alert.alert(label, undefined, [
            ...options.map((o) => ({
              text: o.key === valueKey ? `${o.label}  ✓` : o.label,
              onPress: () => onSelect(o.key),
            })),
            { text: "Cancel", style: "cancel" as const },
          ])
        }
      >
        <Text style={[styles.rowLabel, { color: t.text }]}>{label}</Text>
        <Text
          style={[styles.selectValueText, { color: t.secondary }]}
          numberOfLines={1}
        >
          {valueLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={rowStyle}>
      <Host ignoreSafeArea="all" style={styles.menuHost}>
        <Menu
          label={
            // Fill the fixed-height host in both axes; SwiftUI centers the
            // text vertically and the Spacer pushes the value to the right.
            <HStack
              alignment="center"
              modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}
            >
              <SwiftText
                modifiers={[
                  font({ size: 16, weight: "medium" }),
                  foregroundStyle(t.text),
                ]}
              >
                {label}
              </SwiftText>
              <Spacer />
              <SwiftText
                modifiers={[
                  font({ size: 16, weight: "semibold" }),
                  foregroundStyle(t.secondary),
                ]}
              >
                {valueLabel}
              </SwiftText>
            </HStack>
          }
        >
          {options.map((o) => (
            <Button
              key={o.key}
              label={o.label}
              systemImage={o.key === valueKey ? "checkmark" : undefined}
              onPress={() => onSelect(o.key)}
            />
          ))}
        </Menu>
      </Host>
    </View>
  );
}

const separatorStyle = (t: Theme) => ({
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: t.separator,
});

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 14 },
  // Glass card matching the main tracker screen (rounded 20, hairline border).
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 12,
  },
  cardInner: { paddingHorizontal: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  rowLabel: { fontSize: 16, fontWeight: "500" },
  // Fills the row width so the menu's HStack label spans edge to edge (label
  // left, value right); the fixed height keeps the row's size deterministic
  // instead of waiting on an async matchContents measurement.
  menuHost: { flex: 1, height: 24 },
  selectValueText: {
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stepGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 17 },
  stepValue: {
    minWidth: 52,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    paddingVertical: 0,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
  },
  macroStats: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: { alignItems: "center" },
  statInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  statInput: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 46,
    paddingVertical: 0,
    textAlign: "center",
  },
  statUnit: { fontSize: 13, fontWeight: "600", marginLeft: 2, marginBottom: 1 },
  // Matches the MacroRing's bottom label ("cal") so all four read as one set.
  statLabel: { fontSize: 13, fontWeight: "600", marginTop: 8 },
  saveBtn: {
    marginTop: 8,
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
