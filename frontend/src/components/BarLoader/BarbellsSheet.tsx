import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "../BottomSheet";
import { useThemeColors } from "../../hooks/useThemeColors";
import { Text, TextInput } from "../Text";
import { BarSpec, formatNumber } from "../../utils/plateMath";
import { LBS_PER_KG } from "../../utils/weight";

type Props = {
  visible: boolean;
  onClose: () => void;
  bars: BarSpec[];
  activeBarId: string;
  onSelect: (id: string) => void;
  onAdd: (bar: Omit<BarSpec, "id">) => void;
  onUpdate: (bar: BarSpec) => void;
  onDelete: (id: string) => void;
};

type FormState = {
  id: string | null;
  name: string;
  kg: string;
  lbs: string;
  kgTouched: boolean;
  lbsTouched: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  kg: "",
  lbs: "",
  kgTouched: false,
  lbsTouched: false,
};

/**
 * Manage saved barbells: pick the active bar, add, edit, delete. Both unit
 * weights are separate exact fields; typing one prefills the conversion but
 * never overwrites a value the user typed themselves, so a 44 lb bar stays
 * 44 lbs.
 */
export function BarbellsSheet({
  visible,
  onClose,
  bars,
  activeBarId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const t = useThemeColors();
  const [form, setForm] = useState<FormState | null>(null);

  const closeForm = () => setForm(null);

  const openAdd = () => {
    Haptics.selectionAsync().catch(() => {});
    setForm(EMPTY_FORM);
  };

  const openEdit = (bar: BarSpec) => {
    Haptics.selectionAsync().catch(() => {});
    setForm({
      id: bar.id,
      name: bar.name,
      kg: formatNumber(bar.weightKg),
      lbs: formatNumber(bar.weightLbs),
      kgTouched: true,
      lbsTouched: true,
    });
  };

  const setKg = (kg: string) => {
    setForm((f) => {
      if (!f) return f;
      const parsed = parseFloat(kg);
      const lbs =
        !f.lbsTouched && Number.isFinite(parsed)
          ? formatNumber(Math.round(parsed * LBS_PER_KG * 10) / 10)
          : f.lbs;
      return { ...f, kg, lbs, kgTouched: true };
    });
  };

  const setLbs = (lbs: string) => {
    setForm((f) => {
      if (!f) return f;
      const parsed = parseFloat(lbs);
      const kg =
        !f.kgTouched && Number.isFinite(parsed)
          ? formatNumber(Math.round((parsed / LBS_PER_KG) * 10) / 10)
          : f.kg;
      return { ...f, lbs, kg, lbsTouched: true };
    });
  };

  const save = () => {
    if (!form) return;
    const weightKg = parseFloat(form.kg);
    const weightLbs = parseFloat(form.lbs);
    if (!(weightKg > 0) || !(weightLbs > 0)) {
      Alert.alert("Missing weight", "Enter the bar's weight in both units.");
      return;
    }
    const name = form.name.trim() || "Custom Bar";
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    if (form.id) {
      onUpdate({ id: form.id, name, weightKg, weightLbs });
    } else {
      onAdd({ name, weightKg, weightLbs });
    }
    closeForm();
  };

  const confirmDelete = () => {
    if (!form?.id) return;
    const id = form.id;
    Alert.alert("Delete barbell", "Remove this bar from your list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDelete(id);
          closeForm();
        },
      },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={closeForm}
      avoidKeyboard
      keyboardDismiss
      bodyDrag={false}
    >
      <View style={[styles.header, { borderBottomColor: t.separator }]}>
        <Text style={[styles.title, { color: t.text }]}>
          {form ? (form.id ? "Edit Barbell" : "New Barbell") : "Barbells"}
        </Text>
        <TouchableOpacity onPress={form ? closeForm : onClose} hitSlop={10}>
          <Ionicons
            name={form ? "chevron-back" : "close"}
            size={22}
            color={t.text}
          />
        </TouchableOpacity>
      </View>

      {form ? (
        <View style={styles.form}>
          <Text style={[styles.fieldLabel, { color: t.secondary }]}>NAME</Text>
          <TextInput
            value={form.name}
            onChangeText={(name) => setForm((f) => f && { ...f, name })}
            placeholder="Custom Bar"
            placeholderTextColor={t.secondary}
            style={[styles.input, { color: t.text, borderColor: t.separator }]}
          />
          <View style={styles.weightRow}>
            <View style={styles.weightField}>
              <Text style={[styles.fieldLabel, { color: t.secondary }]}>
                KG
              </Text>
              <TextInput
                value={form.kg}
                onChangeText={setKg}
                keyboardType="decimal-pad"
                placeholder="20"
                placeholderTextColor={t.secondary}
                maxLength={6}
                selectTextOnFocus
                style={[
                  styles.input,
                  { color: t.text, borderColor: t.separator },
                ]}
              />
            </View>
            <View style={styles.weightField}>
              <Text style={[styles.fieldLabel, { color: t.secondary }]}>
                LBS
              </Text>
              <TextInput
                value={form.lbs}
                onChangeText={setLbs}
                keyboardType="decimal-pad"
                placeholder="45"
                placeholderTextColor={t.secondary}
                maxLength={6}
                selectTextOnFocus
                style={[
                  styles.input,
                  { color: t.text, borderColor: t.separator },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={save}
            style={[styles.saveBtn, { borderColor: t.text }]}
          >
            <Text style={[styles.saveBtnText, { color: t.text }]}>
              Save Barbell
            </Text>
          </TouchableOpacity>

          {form.id && bars.length > 1 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={confirmDelete}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteBtnText}>Delete Barbell</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          style={{ maxHeight: Dimensions.get("window").height * 0.72 }}
          showsVerticalScrollIndicator={false}
        >
          {bars.map((bar) => {
            const isSelected = bar.id === activeBarId;
            return (
              <TouchableOpacity
                key={bar.id}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onSelect(bar.id);
                }}
                style={[styles.row, { borderBottomColor: t.separator }]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: t.text }]}>
                    {bar.name}
                  </Text>
                  <Text style={[styles.rowSub, { color: t.secondary }]}>
                    {formatNumber(bar.weightKg)} kg /{" "}
                    {formatNumber(bar.weightLbs)} lbs
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel={`Edit ${bar.name}`}
                  hitSlop={10}
                  onPress={() => openEdit(bar)}
                  style={styles.editBtn}
                >
                  <Ionicons name="pencil" size={16} color={t.secondary} />
                </TouchableOpacity>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isSelected ? t.text : t.secondary,
                      backgroundColor: isSelected ? t.text : "transparent",
                    },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[styles.radioInner, { backgroundColor: t.cardBg }]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openAdd}
            style={styles.addRow}
          >
            <Ionicons name="add" size={20} color={t.text} />
            <Text style={[styles.addLabel, { color: t.text }]}>
              Add barbell
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowSub: {
    fontSize: 13,
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
  editBtn: {
    paddingHorizontal: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 18,
  },
  addLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  weightRow: {
    flexDirection: "row",
    gap: 12,
  },
  weightField: {
    flex: 1,
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  deleteBtn: {
    alignItems: "center",
    paddingVertical: 16,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FF3B30",
  },
});
