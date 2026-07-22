import React from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "../BottomSheet";
import { Text, TextInput } from "../Text";
import { useThemeColors } from "../../hooks/useThemeColors";
import { WeightUnit } from "../../utils/weight";
import { PlateInventory, denomsFor, formatNumber } from "../../utils/plateMath";
import { PlateStepper } from "./PlateStepper";

type Props = {
  visible: boolean;
  onClose: () => void;
  unit: WeightUnit;
  onUnitChange: (unit: WeightUnit) => void;
  inventory: PlateInventory;
  collarPerSide: number;
  onSetPairs: (denom: number, pairs: number) => void;
  onSetCollar: (perSide: number) => void;
  onReset: () => void;
};

const COLLAR_PRESETS: Record<WeightUnit, number[]> = {
  kg: [0, 2.5],
  lbs: [0, 5.5],
};

/**
 * Equipment inventory: pairs of plates owned per denomination and collar
 * weight, per unit. Loading suggestions only use plates configured here.
 */
export function InventorySheet({
  visible,
  onClose,
  unit,
  onUnitChange,
  inventory,
  collarPerSide,
  onSetPairs,
  onSetCollar,
  onReset,
}: Props) {
  const t = useThemeColors();
  const maxHeight = Dimensions.get("window").height * 0.72;

  const collarText = formatNumber(collarPerSide);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      keyboardDismiss
      bodyDrag={false}
    >
      <View style={[styles.header, { borderBottomColor: t.separator }]}>
        <Text style={[styles.title, { color: t.text }]}>Inventory</Text>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={22} color={t.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ maxHeight }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.unitToggle, { backgroundColor: t.unitToggleBg }]}>
          {(["kg", "lbs"] as WeightUnit[]).map((u) => (
            <TouchableOpacity
              key={u}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onUnitChange(u);
              }}
              style={[
                styles.unitBtn,
                u === unit && { backgroundColor: t.unitBtnActiveBg },
              ]}
            >
              <Text
                style={[
                  styles.unitBtnText,
                  { color: u === unit ? t.text : t.secondary },
                ]}
              >
                {u.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: t.secondary }]}>
          PLATE PAIRS AVAILABLE
        </Text>
        <View style={styles.grid}>
          {denomsFor(unit).map((denom) => (
            <PlateStepper
              key={denom}
              denom={denom}
              unit={unit}
              count={inventory[denom] ?? 0}
              onChange={(pairs) => onSetPairs(denom, pairs)}
              size={74}
              dimmed={(inventory[denom] ?? 0) === 0}
            />
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: t.secondary }]}>
          COLLAR WEIGHT (PER SIDE)
        </Text>
        <View style={styles.collarRow}>
          {COLLAR_PRESETS[unit].map((preset) => {
            const active = Math.abs(collarPerSide - preset) < 1e-9;
            return (
              <TouchableOpacity
                key={preset}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onSetCollar(preset);
                }}
                style={[
                  styles.collarChip,
                  {
                    borderColor: active ? t.text : t.border,
                    backgroundColor: active ? t.text : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.collarChipText,
                    { color: active ? t.bg : t.text },
                  ]}
                >
                  {preset === 0 ? "None" : `${formatNumber(preset)} ${unit}`}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TextInput
            value={collarText === "0" ? "" : collarText}
            onChangeText={(v) => {
              const parsed = parseFloat(v);
              onSetCollar(Number.isFinite(parsed) ? parsed : 0);
            }}
            keyboardType="decimal-pad"
            placeholder="Custom"
            placeholderTextColor={t.secondary}
            maxLength={5}
            selectTextOnFocus
            style={[
              styles.collarInput,
              { color: t.text, borderColor: t.separator },
            ]}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onReset}
          style={styles.resetRow}
        >
          <Text style={[styles.resetText, { color: t.secondary }]}>
            Reset {unit} inventory to defaults
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  unitToggle: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
    marginBottom: 18,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 22,
  },
  collarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  collarChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  collarChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  collarInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  resetRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  resetText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
