import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { PickerSheet } from "./PickerSheet";
import { useOnboardingColors } from "./useOnboardingColors";
import { Height, Weight } from "../types";
import { formatHeight, formatWeight } from "../units";
import {
  FT_VALUES,
  IN_VALUES,
  CM_VALUES,
  LB_VALUES,
  KG_VALUES,
} from "../pickerConstants";

type Colors = ReturnType<typeof useOnboardingColors>;

export function UnitToggle({
  active,
  options,
  onChange,
  colors,
}: {
  active: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  colors: Colors;
}) {
  return (
    <View style={[styles.unitToggle, { backgroundColor: colors.unitToggleBg }]}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[
            styles.unitBtn,
            active === opt.value && { backgroundColor: colors.unitBtnActiveBg },
          ]}
        >
          <Text
            style={[
              styles.unitBtnText,
              { color: active === opt.value ? colors.text : colors.secondary },
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  onPress,
  colors,
}: {
  label: string;
  value: string;
  sub?: string;
  onPress: () => void;
  colors: Colors;
}) {
  return (
    <Pressable
      style={[
        styles.bigCard,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.cardLabel, { color: colors.secondary }]}>
        {label}
      </Text>
      <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
      {sub ? (
        <Text style={[styles.cardSub, { color: colors.secondary }]}>{sub}</Text>
      ) : null}
      <Text style={[styles.tapHint, { color: colors.secondary }]}>
        Tap to change
      </Text>
    </Pressable>
  );
}

export function HeightPickerSheet({
  visible,
  initial,
  onClose,
  onDone,
}: {
  visible: boolean;
  initial?: Height;
  onClose: () => void;
  onDone: (h: Height) => void;
}) {
  const colors = useOnboardingColors();
  const [unit, setUnit] = useState<"ft_in" | "cm">(
    initial?.unit === "cm" ? "cm" : "ft_in",
  );
  const [ft, setFt] = useState(initial?.unit === "ft_in" ? initial.ft : 5);
  const [inch, setInch] = useState(
    initial?.unit === "ft_in" ? initial.inch : 11,
  );
  const [cm, setCm] = useState(initial?.unit === "cm" ? initial.cm : 170);

  return (
    <PickerSheet
      visible={visible}
      title="Your height"
      colors={colors}
      onClose={onClose}
      onDone={() =>
        onDone(
          unit === "ft_in" ? { unit: "ft_in", ft, inch } : { unit: "cm", cm },
        )
      }
      unitToggle={
        <UnitToggle
          active={unit}
          options={[
            { label: "ft / in", value: "ft_in" },
            { label: "cm", value: "cm" },
          ]}
          onChange={(v) => setUnit(v as "ft_in" | "cm")}
          colors={colors}
        />
      }
    >
      <View style={styles.pickerRow}>
        {unit === "ft_in" ? (
          <>
            <Picker
              selectedValue={ft}
              onValueChange={setFt}
              style={styles.picker}
              itemStyle={[styles.pickerItem, { color: colors.text }]}
            >
              {FT_VALUES.map((v) => (
                <Picker.Item key={v} label={`${v} ft`} value={v} />
              ))}
            </Picker>
            <Picker
              selectedValue={inch}
              onValueChange={setInch}
              style={styles.picker}
              itemStyle={[styles.pickerItem, { color: colors.text }]}
            >
              {IN_VALUES.map((v) => (
                <Picker.Item key={v} label={`${v} in`} value={v} />
              ))}
            </Picker>
          </>
        ) : (
          <Picker
            selectedValue={cm}
            onValueChange={setCm}
            style={[styles.picker, { flex: 1 }]}
            itemStyle={[styles.pickerItem, { color: colors.text }]}
          >
            {CM_VALUES.map((v) => (
              <Picker.Item key={v} label={`${v} cm`} value={v} />
            ))}
          </Picker>
        )}
      </View>
    </PickerSheet>
  );
}

export function WeightPickerSheet({
  visible,
  title,
  initial,
  onClose,
  onDone,
}: {
  visible: boolean;
  title: string;
  initial?: Weight;
  onClose: () => void;
  onDone: (w: Weight) => void;
}) {
  const colors = useOnboardingColors();
  const [unit, setUnit] = useState<"lbs" | "kg">(
    initial?.unit === "kg" ? "kg" : "lbs",
  );
  const [val, setVal] = useState(initial?.value ?? 165);

  return (
    <PickerSheet
      visible={visible}
      title={title}
      colors={colors}
      onClose={onClose}
      onDone={() => onDone({ unit, value: val })}
      unitToggle={
        <UnitToggle
          active={unit}
          options={[
            { label: "lbs", value: "lbs" },
            { label: "kg", value: "kg" },
          ]}
          onChange={(v) => {
            setUnit(v as "lbs" | "kg");
            setVal(v === "kg" ? 75 : 165);
          }}
          colors={colors}
        />
      }
    >
      <View style={styles.pickerRow}>
        <Picker
          selectedValue={val}
          onValueChange={setVal}
          style={[styles.picker, { flex: 1 }]}
          itemStyle={[styles.pickerItem, { color: colors.text }]}
        >
          {(unit === "lbs" ? LB_VALUES : KG_VALUES).map((v) => (
            <Picker.Item key={v} label={`${v} ${unit}`} value={v} />
          ))}
        </Picker>
      </View>
    </PickerSheet>
  );
}

/** Inline height picker (unit toggle + wheels) for a full-screen step.
 *  Emits the selected Height whenever it changes, including on mount. */
export function HeightPickerInline({
  initial,
  onChange,
  colors,
}: {
  initial?: Height;
  onChange: (h: Height) => void;
  colors: Colors;
}) {
  const [unit, setUnit] = useState<"ft_in" | "cm">(
    initial?.unit === "cm" ? "cm" : "ft_in",
  );
  const [ft, setFt] = useState(initial?.unit === "ft_in" ? initial.ft : 5);
  const [inch, setInch] = useState(
    initial?.unit === "ft_in" ? initial.inch : 11,
  );
  const [cm, setCm] = useState(initial?.unit === "cm" ? initial.cm : 170);

  useEffect(() => {
    onChange(
      unit === "ft_in" ? { unit: "ft_in", ft, inch } : { unit: "cm", cm },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, ft, inch, cm]);

  return (
    <View style={styles.inlineWrap}>
      <View style={styles.toggleWrap}>
        <UnitToggle
          active={unit}
          options={[
            { label: "ft / in", value: "ft_in" },
            { label: "cm", value: "cm" },
          ]}
          onChange={(v) => setUnit(v as "ft_in" | "cm")}
          colors={colors}
        />
      </View>
      <View style={styles.pickerRow}>
        {unit === "ft_in" ? (
          <>
            <Picker
              selectedValue={ft}
              onValueChange={setFt}
              style={styles.picker}
              itemStyle={[styles.pickerItem, { color: colors.text }]}
            >
              {FT_VALUES.map((v) => (
                <Picker.Item key={v} label={`${v} ft`} value={v} />
              ))}
            </Picker>
            <Picker
              selectedValue={inch}
              onValueChange={setInch}
              style={styles.picker}
              itemStyle={[styles.pickerItem, { color: colors.text }]}
            >
              {IN_VALUES.map((v) => (
                <Picker.Item key={v} label={`${v} in`} value={v} />
              ))}
            </Picker>
          </>
        ) : (
          <Picker
            selectedValue={cm}
            onValueChange={setCm}
            style={[styles.picker, { flex: 1 }]}
            itemStyle={[styles.pickerItem, { color: colors.text }]}
          >
            {CM_VALUES.map((v) => (
              <Picker.Item key={v} label={`${v} cm`} value={v} />
            ))}
          </Picker>
        )}
      </View>
    </View>
  );
}

/** Inline weight picker (unit toggle + wheel) for a full-screen step. */
export function WeightPickerInline({
  initial,
  onChange,
  colors,
}: {
  initial?: Weight;
  onChange: (w: Weight) => void;
  colors: Colors;
}) {
  const [unit, setUnit] = useState<"lbs" | "kg">(
    initial?.unit === "kg" ? "kg" : "lbs",
  );
  const [val, setVal] = useState(initial?.value ?? 165);

  useEffect(() => {
    onChange({ unit, value: val });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, val]);

  return (
    <View style={styles.inlineWrap}>
      <View style={styles.toggleWrap}>
        <UnitToggle
          active={unit}
          options={[
            { label: "lbs", value: "lbs" },
            { label: "kg", value: "kg" },
          ]}
          onChange={(v) => {
            const next = v as "lbs" | "kg";
            setUnit(next);
            setVal(next === "kg" ? 75 : 165);
          }}
          colors={colors}
        />
      </View>
      <View style={styles.pickerRow}>
        <Picker
          selectedValue={val}
          onValueChange={setVal}
          style={[styles.picker, { flex: 1 }]}
          itemStyle={[styles.pickerItem, { color: colors.text }]}
        >
          {(unit === "lbs" ? LB_VALUES : KG_VALUES).map((v) => (
            <Picker.Item key={v} label={`${v} ${unit}`} value={v} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

export { formatHeight, formatWeight };

const styles = StyleSheet.create({
  bigCard: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.7,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -2,
    lineHeight: 52,
  },
  cardSub: {
    fontSize: 13,
    marginTop: 4,
  },
  tapHint: {
    fontSize: 12,
    marginTop: 5,
  },
  unitToggle: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
  inlineWrap: {
    alignSelf: "stretch",
  },
  toggleWrap: {
    alignSelf: "center",
    width: 160,
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: "row",
    height: 216,
  },
  picker: {
    flex: 1,
    height: 216,
  },
  pickerItem: {
    fontSize: 18,
  },
});
