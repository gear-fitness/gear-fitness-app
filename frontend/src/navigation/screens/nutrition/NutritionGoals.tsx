import React, { useCallback, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "../../../components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { useNutrition } from "../../../context/NutritionContext";
import { getGoal, updateGoal } from "../../../api/nutritionService";
import { Spinner } from "../../../components/Spinner";

const FIELDS = [
  { key: "calorieGoal", label: "Calories", suffix: "cal" },
  { key: "proteinG", label: "Protein", suffix: "g" },
  { key: "carbsG", label: "Carbs", suffix: "g" },
  { key: "fatG", label: "Fat", suffix: "g" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function NutritionGoals() {
  const t = useThemeColors();
  const navigation = useNavigation<any>();
  const { refresh } = useNutrition();

  const [values, setValues] = useState<Record<FieldKey, string>>({
    calorieGoal: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = (goal: {
    calorieGoal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }) =>
    setValues({
      calorieGoal: String(goal.calorieGoal),
      proteinG: String(goal.proteinG),
      carbsG: String(goal.carbsG),
      fatG: String(goal.fatG),
    });

  // Load on focus (not just mount) so returning from the calculator wizard
  // shows the freshly recalculated numbers.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          load(await getGoal());
        } catch (err) {
          console.error("Failed to load goal:", err);
        } finally {
          setLoading(false);
        }
      })();
    }, []),
  );

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateGoal({
        calorieGoal: parseInt(values.calorieGoal, 10) || 0,
        proteinG: parseInt(values.proteinG, 10) || 0,
        carbsG: parseInt(values.carbsG, 10) || 0,
        fatG: parseInt(values.fatG, 10) || 0,
      });
      await refresh();
      navigation.goBack();
    } catch (err) {
      console.error("Failed to save goal:", err);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
      <View style={styles.header}>
        <TouchableOpacity hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Daily Goals</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <Spinner style={{ marginTop: 40 }} color={t.secondary} />
      ) : (
        <View style={styles.body}>
          <View
            style={[
              styles.card,
              { backgroundColor: t.cardBg, borderColor: t.cardBorder },
            ]}
          >
            {FIELDS.map((f, i) => (
              <View
                key={f.key}
                style={[
                  styles.fieldRow,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: t.separator,
                  },
                ]}
              >
                <Text style={[styles.fieldLabel, { color: t.text }]}>
                  {f.label}
                </Text>
                <View style={styles.fieldInputWrap}>
                  <TextInput
                    value={values[f.key]}
                    onChangeText={(text) =>
                      setValues((v) => ({
                        ...v,
                        [f.key]: text.replace(/[^0-9]/g, ""),
                      }))
                    }
                    keyboardType="number-pad"
                    selectTextOnFocus
                    style={[styles.fieldInput, { color: t.text }]}
                  />
                  <Text style={[styles.suffix, { color: t.secondary }]}>
                    {f.suffix}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Opens the same stepped calculator that runs on first tracker
              view: stats, activity, and cut/bulk goal, then a server-side
              recalculation of these numbers. */}
          <TouchableOpacity
            style={styles.recalc}
            onPress={() => navigation.navigate("NutritionSetup")}
            disabled={saving}
          >
            <Ionicons name="calculator-outline" size={16} color={t.tint} />
            <Text style={[styles.recalcText, { color: t.tint }]}>
              Recalculate with the calorie calculator
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: t.accent }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={[styles.saveText, { color: t.accentText }]}>
              {saving ? "Saving…" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  body: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  fieldLabel: { fontSize: 16 },
  fieldInputWrap: { flexDirection: "row", alignItems: "center" },
  fieldInput: {
    fontSize: 17,
    fontWeight: "600",
    minWidth: 64,
    textAlign: "right",
  },
  suffix: { fontSize: 14, marginLeft: 4, width: 28 },
  recalc: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    marginTop: 20,
  },
  recalcText: { fontSize: 15, fontWeight: "500" },
  saveBtn: {
    marginTop: 28,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveText: { fontSize: 16, fontWeight: "600" },
});
