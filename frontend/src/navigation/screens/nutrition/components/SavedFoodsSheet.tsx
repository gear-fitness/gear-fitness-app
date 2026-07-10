import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Text, TextInput } from "../../../../components/Text";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { useNutrition } from "../../../../context/NutritionContext";
import {
  aiEstimateFood,
  createCustomFood,
  CustomFoodPayload,
  deleteCustomFood,
  getCustomFoods,
  updateCustomFood,
} from "../../../../api/nutritionService";
import { FoodItem } from "../../../../api/types";
import { BottomSheet } from "../../../../components/BottomSheet";
import { SearchBar } from "../../../../components/SearchBar";

type Theme = ReturnType<typeof useThemeColors>;

const round = (n: number | null | undefined) => Math.round(n ?? 0);
const round1 = (n: number | null | undefined) => Math.round((n ?? 0) * 10) / 10;

type Mode = "list" | "create" | "edit";

/**
 * The "Favorites" sheet: the user's custom foods — a name, calories, and
 * macros saved for reuse (meal-preppers log the same thing repeatedly). The
 * sheet lists them with search and one-tap logging; "+" opens the create form,
 * the pencil toggles edit mode where tapping a meal opens the edit form (with
 * delete). Custom foods are stored server-side per user and also surface in
 * the Add food database search.
 */
export function SavedFoodsSheet({
  visible,
  onClose,
  initialMode,
  initialDescription,
}: {
  visible: boolean;
  onClose: () => void;
  /**
   * Land directly on the create form when opening (the barcode scanner's
   * product-not-found fallback), optionally prefilled with the product name.
   */
  initialMode?: "create";
  initialDescription?: string;
}) {
  const t = useThemeColors();
  const { height: windowHeight } = useWindowDimensions();
  const { addLog } = useNutrition();

  const [mode, setMode] = useState<Mode>("list");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  // Pencil toggle: tapping a meal edits it instead of logging.
  const [editMode, setEditMode] = useState(false);

  // Per-food logging feedback (spinner then checkmark), like Add food's rows.
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [loggedIds, setLoggedIds] = useState<Record<string, boolean>>({});

  // Create/edit form state. `editingFood` is set in edit mode.
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [description, setDescription] = useState("");
  const [nickname, setNickname] = useState("");
  const [caloriesText, setCaloriesText] = useState("");
  const [proteinText, setProteinText] = useState("");
  const [carbsText, setCarbsText] = useState("");
  const [fatText, setFatText] = useState("");
  const [saving, setSaving] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const loadFoods = useCallback(async () => {
    setLoading(true);
    try {
      setFoods(await getCustomFoods());
    } catch (err) {
      console.error("Failed to load custom foods:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fresh state each open; an initialMode of "create" skips the list and
  // lands on the (optionally prefilled) create form.
  useEffect(() => {
    if (visible) {
      setEditMode(false);
      setQuery("");
      setLoggedIds({});
      loadFoods();
      if (initialMode === "create") {
        setEditingFood(null);
        setDescription(initialDescription ?? "");
        setNickname("");
        setCaloriesText("");
        setProteinText("");
        setCarbsText("");
        setFatText("");
        setEstimateError(null);
        setMode("create");
      } else {
        setMode("list");
      }
    }
  }, [visible, loadFoods, initialMode, initialDescription]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter(
      (f) =>
        f.description.toLowerCase().includes(q) ||
        (f.nickname ?? "").toLowerCase().includes(q),
    );
  }, [foods, query]);

  const openCreate = () => {
    Haptics.selectionAsync().catch(() => {});
    setEditingFood(null);
    setDescription("");
    setNickname("");
    setCaloriesText("");
    setProteinText("");
    setCarbsText("");
    setFatText("");
    setEstimateError(null);
    setMode("create");
  };

  const openEdit = (food: FoodItem) => {
    Haptics.selectionAsync().catch(() => {});
    setEditingFood(food);
    setDescription(food.description);
    setNickname(food.nickname ?? "");
    // Custom foods store per-serving values (servingSize 100 makes per-100g
    // and per-serving identical), so the fields read back exactly as entered.
    setCaloriesText(String(round(food.calories)));
    setProteinText(food.proteinG == null ? "" : String(round1(food.proteinG)));
    setCarbsText(food.carbsG == null ? "" : String(round1(food.carbsG)));
    setFatText(food.fatG == null ? "" : String(round1(food.fatG)));
    setEstimateError(null);
    setMode("edit");
  };

  const backToList = () => {
    setMode("list");
    setEditingFood(null);
  };

  const calories = parseFloat(caloriesText);
  const canSave =
    description.trim().length > 0 &&
    caloriesText.trim().length > 0 &&
    !Number.isNaN(calories) &&
    calories >= 0 &&
    !saving;

  const buildPayload = (): CustomFoodPayload => ({
    description: description.trim(),
    nickname: nickname.trim() || null,
    calories,
    proteinG: parseFloat(proteinText) || 0,
    carbsG: parseFloat(carbsText) || 0,
    fatG: parseFloat(fatText) || 0,
  });

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (mode === "edit" && editingFood) {
        await updateCustomFood(editingFood.foodId, buildPayload());
      } else {
        await createCustomFood(buildPayload());
      }
      await loadFoods();
      backToList();
    } catch (err) {
      console.error("Failed to save custom food:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingFood) return;
    const name = editingFood.nickname ?? editingFood.description;
    Alert.alert("Delete meal", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCustomFood(editingFood.foodId);
            await loadFoods();
            backToList();
          } catch (err) {
            console.error("Failed to delete custom food:", err);
          }
        },
      },
    ]);
  };

  // AI estimate for the described meal — fills the nutrition fields, logs
  // nothing. Same Sonar pipeline (and caps) as the journal's typed lines.
  const handleEstimate = async () => {
    const text = description.trim();
    if (!text || estimating) return;
    setEstimating(true);
    setEstimateError(null);
    try {
      const est = await aiEstimateFood(text);
      if (est.noFood) {
        setEstimateError("No food recognized — enter the nutrition manually.");
      } else {
        setCaloriesText(String(round(est.calories)));
        setProteinText(String(round1(est.proteinG)));
        setCarbsText(String(round1(est.carbsG)));
        setFatText(String(round1(est.fatG)));
      }
    } catch (err) {
      console.error("AI estimate failed:", err);
      setEstimateError("Couldn't estimate right now — try again.");
    } finally {
      setEstimating(false);
    }
  };

  // Log one serving of a saved meal to the selected day. The journal notices
  // the new entry in the day summary and materializes a line for it.
  const handleLog = async (food: FoodItem) => {
    if (loggingId) return;
    setLoggingId(food.foodId);
    try {
      await addLog(
        {
          foodId: food.foodId,
          quantity: 1,
          unit: "SERVING",
          sourceType: "DB",
        },
        {
          unitKey: "serving",
          quantity: 1,
          servingGrams: 100,
          units: food.units,
        },
      );
      setLoggedIds((prev) => ({ ...prev, [food.foodId]: true }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    } catch (err) {
      console.error("Failed to log custom food:", err);
    } finally {
      setLoggingId(null);
    }
  };

  const inForm = mode !== "list";
  const title =
    mode === "create"
      ? "Create Meal"
      : mode === "edit"
        ? "Edit Meal"
        : "Favorites";

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      keyboardDismiss
      bodyDrag={false}
    >
      <View style={{ maxHeight: windowHeight * 0.78 }}>
        {/* Header: close, centered title, and the mode's primary action. The
            title spans the row absolutely so it stays truly centered even
            though the left and right controls differ in width. */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.text }]} pointerEvents="none">
            {title}
          </Text>

          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: t.surface }]}
            accessibilityLabel={inForm ? "Back to favorites" : "Close"}
            hitSlop={8}
            onPress={inForm ? backToList : onClose}
          >
            <Ionicons name="close" size={20} color={t.text} />
          </TouchableOpacity>

          {mode === "list" ? (
            <View style={[styles.headerPill, { backgroundColor: t.surface }]}>
              <TouchableOpacity
                accessibilityLabel="Edit meals"
                hitSlop={8}
                style={styles.pillBtn}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setEditMode((v) => !v);
                }}
              >
                <Ionicons
                  name="pencil"
                  size={17}
                  color={editMode ? t.tint : t.secondary}
                />
              </TouchableOpacity>
              <View
                style={[styles.pillDivider, { backgroundColor: t.separator }]}
              />
              <TouchableOpacity
                accessibilityLabel="Create meal"
                hitSlop={8}
                style={styles.pillBtn}
                onPress={openCreate}
              >
                <Ionicons name="add" size={22} color={t.text} />
              </TouchableOpacity>
            </View>
          ) : mode === "create" ? (
            <TouchableOpacity
              style={[
                styles.createBtn,
                { backgroundColor: canSave ? t.accent : t.surface },
              ]}
              disabled={!canSave}
              onPress={handleSave}
              accessibilityLabel="Create meal"
            >
              {saving ? (
                <ActivityIndicator size="small" color={t.accentText} />
              ) : (
                <Text
                  style={[
                    styles.createBtnText,
                    { color: canSave ? t.accentText : t.secondary },
                  ]}
                >
                  Create
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.circleBtn,
                { backgroundColor: canSave ? t.accent : t.surface },
              ]}
              disabled={!canSave}
              onPress={handleSave}
              accessibilityLabel="Save meal"
            >
              {saving ? (
                <ActivityIndicator size="small" color={t.accentText} />
              ) : (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={canSave ? t.accentText : t.secondary}
                />
              )}
            </TouchableOpacity>
          )}
        </View>

        {mode === "list" ? (
          <>
            <View style={styles.searchWrap}>
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder="Search favorites"
              />
            </View>

            <ScrollView
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {loading && foods.length === 0 ? (
                <ActivityIndicator
                  style={{ marginTop: 24 }}
                  color={t.secondary}
                />
              ) : filtered.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="bookmark-outline"
                    size={44}
                    color={t.border}
                  />
                  <Text style={[styles.emptyText, { color: t.text }]}>
                    {query ? "No favorites found" : "No favorites yet"}
                  </Text>
                  {!query && (
                    <Text style={[styles.emptySubtext, { color: t.secondary }]}>
                      Save the meals you eat on repeat and log them in one tap.
                    </Text>
                  )}
                </View>
              ) : (
                filtered.map((food) => (
                  <FoodCard
                    key={food.foodId}
                    food={food}
                    t={t}
                    editMode={editMode}
                    busy={loggingId === food.foodId}
                    logged={!!loggedIds[food.foodId]}
                    onPress={() =>
                      editMode ? openEdit(food) : handleLog(food)
                    }
                    onEdit={() => openEdit(food)}
                  />
                ))
              )}
            </ScrollView>
          </>
        ) : (
          <ScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.fieldLabel, { color: t.secondary }]}>
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Chicken breast with rice and broccoli"
              placeholderTextColor={t.secondary}
              multiline
              style={[
                styles.input,
                styles.descriptionInput,
                {
                  backgroundColor: t.surface,
                  borderColor: t.cardBorder,
                  color: t.text,
                },
              ]}
            />

            <Text style={[styles.fieldLabel, { color: t.secondary }]}>
              Nickname (optional)
            </Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="e.g., Post-workout meal"
              placeholderTextColor={t.secondary}
              style={[
                styles.input,
                {
                  backgroundColor: t.surface,
                  borderColor: t.cardBorder,
                  color: t.text,
                },
              ]}
            />

            {/* AI estimate — appears once there's something to estimate. */}
            {description.trim().length > 0 && (
              <>
                <TouchableOpacity
                  style={[
                    styles.estimateBtn,
                    { backgroundColor: t.surface, borderColor: t.cardBorder },
                  ]}
                  disabled={estimating}
                  onPress={handleEstimate}
                  accessibilityLabel="Calculate calories for me"
                >
                  {estimating ? (
                    <ActivityIndicator size="small" color={t.tint} />
                  ) : (
                    <MaterialCommunityIcons
                      name="creation"
                      size={18}
                      color={t.tint}
                    />
                  )}
                  <Text style={[styles.estimateText, { color: t.text }]}>
                    Calculate calories for me
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={t.secondary}
                  />
                </TouchableOpacity>
                {estimateError && (
                  <Text style={[styles.estimateError, { color: t.danger }]}>
                    {estimateError}
                  </Text>
                )}
              </>
            )}

            <Text style={[styles.fieldLabel, { color: t.secondary }]}>
              Calories
            </Text>
            <TextInput
              value={caloriesText}
              onChangeText={setCaloriesText}
              placeholder="0"
              placeholderTextColor={t.secondary}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  backgroundColor: t.surface,
                  borderColor: t.cardBorder,
                  color: t.text,
                },
              ]}
            />

            <Text style={[styles.fieldLabel, { color: t.secondary }]}>
              Macros (optional)
            </Text>
            <View style={styles.macroRow}>
              <MacroField
                label="Protein"
                value={proteinText}
                onChangeText={setProteinText}
                t={t}
              />
              <MacroField
                label="Carbs"
                value={carbsText}
                onChangeText={setCarbsText}
                t={t}
              />
              <MacroField
                label="Fat"
                value={fatText}
                onChangeText={setFatText}
                t={t}
              />
            </View>

            {mode === "edit" && (
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: t.danger }]}
                onPress={handleDelete}
                accessibilityLabel="Delete meal"
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.deleteBtnText}>Delete Meal</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  );
}

/** One saved meal: name, nutrition line, and a log (or edit) affordance. */
function FoodCard({
  food,
  t,
  editMode,
  busy,
  logged,
  onPress,
  onEdit,
}: {
  food: FoodItem;
  t: Theme;
  editMode: boolean;
  busy: boolean;
  logged: boolean;
  onPress: () => void;
  onEdit: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: t.cardBg, borderColor: t.cardBorder },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityLabel={
        editMode
          ? `Edit ${food.nickname ?? food.description}`
          : `Log ${food.nickname ?? food.description}`
      }
    >
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: t.text }]} numberOfLines={1}>
          {food.nickname ?? food.description}
        </Text>
        <Text style={[styles.cardMeta, { color: t.secondary }]}>
          {round(food.calories)} cal · P {round1(food.proteinG)}g · C{" "}
          {round1(food.carbsG)}g · F {round1(food.fatG)}g
        </Text>
      </View>

      {editMode ? (
        <TouchableOpacity
          style={[styles.cardAction, { backgroundColor: t.surface }]}
          hitSlop={8}
          onPress={onEdit}
          accessibilityLabel={`Edit ${food.nickname ?? food.description}`}
        >
          <Ionicons name="pencil" size={16} color={t.text} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.cardAction, { backgroundColor: t.accent }]}
          hitSlop={8}
          disabled={busy}
          onPress={onPress}
          accessibilityLabel={`Log ${food.nickname ?? food.description}`}
        >
          {busy ? (
            <ActivityIndicator size="small" color={t.accentText} />
          ) : (
            <Ionicons
              name={logged ? "checkmark" : "add"}
              size={20}
              color={t.accentText}
            />
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function MacroField({
  label,
  value,
  onChangeText,
  t,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  t: Theme;
}) {
  return (
    <View style={styles.macroCol}>
      <Text style={[styles.macroLabel, { color: t.secondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={t.secondary}
        keyboardType="decimal-pad"
        style={[
          styles.input,
          styles.macroInput,
          {
            backgroundColor: t.surface,
            borderColor: t.cardBorder,
            color: t.text,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    paddingHorizontal: 4,
  },
  pillBtn: {
    paddingHorizontal: 8,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  pillDivider: { width: StyleSheet.hairlineWidth, height: 18 },
  createBtn: {
    borderRadius: 18,
    height: 36,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: { fontSize: 15, fontWeight: "700" },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  cardInfo: { flex: 1, paddingRight: 12 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardMeta: { fontSize: 13, marginTop: 4 },
  cardAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: { alignItems: "center", paddingVertical: 28, gap: 4 },
  emptyText: { fontSize: 16, fontWeight: "600", marginTop: 10 },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 2,
    paddingHorizontal: 24,
  },
  formContent: { paddingHorizontal: 16, paddingBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  descriptionInput: { minHeight: 84, textAlignVertical: "top" },
  estimateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 13,
    marginTop: 16,
  },
  estimateText: { fontSize: 15, fontWeight: "600" },
  estimateError: { fontSize: 13, marginTop: 8, textAlign: "center" },
  macroRow: { flexDirection: "row", gap: 10 },
  macroCol: { flex: 1 },
  macroLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  macroInput: { paddingVertical: 10 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 24,
  },
  deleteBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
