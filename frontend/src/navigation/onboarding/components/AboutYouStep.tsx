import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Height, Weight, DOB } from "../types";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { PickerSheet } from "./PickerSheet";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { calcAge } from "../calcAge";

// ─── Helpers ───────────────────────────────────────────────────
function formatHeight(h?: Height): string {
  if (!h) return "—";
  if (h.unit === "ft_in") return `${h.ft}' ${h.inch}"`;
  return `${h.cm} cm`;
}

function formatWeight(w?: Weight): string {
  if (!w) return "—";
  return `${w.value} ${w.unit}`;
}

function formatDOB(dob?: DOB): { age: string; date: string } {
  const MONTHS_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (!dob) return { age: "—", date: "Not set" };
  const age = calcAge(dob.year, dob.month, dob.day);
  return {
    age: `${age}`,
    date: `${MONTHS_SHORT[dob.month]} ${dob.day}, ${dob.year}`,
  };
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ─── DOB picker data ───────────────────────────────────────────
const DOB_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOB_YEARS = Array.from({ length: 80 }, (_, i) => 2007 - i);

// ─── Height picker data ────────────────────────────────────────
const FT_VALUES = [3, 4, 5, 6, 7];
const IN_VALUES = Array.from({ length: 12 }, (_, i) => i);
const CM_VALUES = Array.from({ length: 121 }, (_, i) => i + 100);

// ─── Weight picker data ────────────────────────────────────────
const LB_VALUES = Array.from({ length: 301 }, (_, i) => i + 50);
const KG_VALUES = Array.from({ length: 201 }, (_, i) => i + 20);

interface AboutYouStepProps {
  height?: Height;
  weight?: Weight;
  dob?: DOB;
  onHeightChange: (h: Height) => void;
  onWeightChange: (w: Weight) => void;
  onDobChange: (d: DOB) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function AboutYouStep({
  height,
  weight,
  dob,
  onHeightChange,
  onWeightChange,
  onDobChange,
  onBack,
  onContinue,
}: AboutYouStepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const [htSheet, setHtSheet] = useState(false);
  const [wtSheet, setWtSheet] = useState(false);
  const [bdSheet, setBdSheet] = useState(false);

  // ─── Height local state ────────────────────────────────────
  const [htUnit, setHtUnit] = useState<"ft_in" | "cm">(
    height?.unit === "cm" ? "cm" : "ft_in",
  );
  const [htFt, setHtFt] = useState(height?.unit === "ft_in" ? height.ft : 5);
  const [htIn, setHtIn] = useState(height?.unit === "ft_in" ? height.inch : 11);
  const [htCm, setHtCm] = useState(height?.unit === "cm" ? height.cm : 170);

  // ─── Weight local state ────────────────────────────────────
  const [wtUnit, setWtUnit] = useState<"lbs" | "kg">(
    weight?.unit === "kg" ? "kg" : "lbs",
  );
  const [wtVal, setWtVal] = useState(weight ? weight.value : 165);

  // ─── DOB local state ──────────────────────────────────────
  const [bdMonth, setBdMonth] = useState(dob?.month ?? 4);
  const [bdDay, setBdDay] = useState(dob?.day ?? 26);
  const [bdYear, setBdYear] = useState(dob?.year ?? 2000);

  // ─── Done handlers ────────────────────────────────────────
  const doneHeight = () => {
    onHeightChange(
      htUnit === "ft_in"
        ? { unit: "ft_in", ft: htFt, inch: htIn }
        : { unit: "cm", cm: htCm },
    );
    setHtSheet(false);
  };

  const doneWeight = () => {
    onWeightChange({ unit: wtUnit, value: wtVal });
    setWtSheet(false);
  };

  const handleBdMonthChange = (month: number) => {
    setBdMonth(month);
    const max = getDaysInMonth(month, bdYear);
    if (bdDay > max) setBdDay(max);
  };

  const handleBdYearChange = (year: number) => {
    setBdYear(year);
    const max = getDaysInMonth(bdMonth, year);
    if (bdDay > max) setBdDay(max);
  };

  const doneDOB = () => {
    onDobChange({ year: bdYear, month: bdMonth, day: bdDay });
    setBdSheet(false);
  };

  const { age, date } = formatDOB(dob);

  const unitToggle = (
    active: string,
    options: { label: string; value: string }[],
    onChange: (v: string) => void,
  ) => (
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

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={0.4} onBack={onBack} />
      <View style={shared.body}>
        <Text style={shared.heading}>About you</Text>
        <Text style={shared.subheading}>
          Helps us personalise your calorie goals and workout intensity.
        </Text>
        <View style={styles.cardsWrap}>
          <Pressable
            style={[
              styles.bigCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => setHtSheet(true)}
          >
            <Text style={[styles.cardLabel, { color: colors.secondary }]}>
              HEIGHT
            </Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {formatHeight(height)}
            </Text>
            <Text style={[styles.tapHint, { color: colors.secondary }]}>
              Tap to change
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.bigCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => setWtSheet(true)}
          >
            <Text style={[styles.cardLabel, { color: colors.secondary }]}>
              WEIGHT
            </Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {formatWeight(weight)}
            </Text>
            <Text style={[styles.tapHint, { color: colors.secondary }]}>
              Tap to change
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.bigCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => setBdSheet(true)}
          >
            <Text style={[styles.cardLabel, { color: colors.secondary }]}>
              AGE
            </Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {age}
            </Text>
            {dob && (
              <Text style={[styles.cardSub, { color: colors.secondary }]}>
                {date}
              </Text>
            )}
            <Text style={[styles.tapHint, { color: colors.secondary }]}>
              Tap to change
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={shared.footer}>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [
            shared.continueBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={shared.continueBtnText}>Continue</Text>
        </Pressable>
      </View>

      {/* ── Height Sheet ─────────────────────────────────── */}
      <PickerSheet
        visible={htSheet}
        title="Your height"
        colors={colors}
        onClose={() => setHtSheet(false)}
        onDone={doneHeight}
        unitToggle={unitToggle(
          htUnit,
          [
            { label: "ft / in", value: "ft_in" },
            { label: "cm", value: "cm" },
          ],
          (v) => setHtUnit(v as "ft_in" | "cm"),
        )}
      >
        <View style={styles.pickerRow}>
          {htUnit === "ft_in" ? (
            <>
              <Picker
                selectedValue={htFt}
                onValueChange={setHtFt}
                style={styles.picker}
                itemStyle={[styles.pickerItem, { color: colors.text }]}
              >
                {FT_VALUES.map((v) => (
                  <Picker.Item key={v} label={`${v} ft`} value={v} />
                ))}
              </Picker>
              <Picker
                selectedValue={htIn}
                onValueChange={setHtIn}
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
              selectedValue={htCm}
              onValueChange={setHtCm}
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

      {/* ── Weight Sheet ─────────────────────────────────── */}
      <PickerSheet
        visible={wtSheet}
        title="Your weight"
        colors={colors}
        onClose={() => setWtSheet(false)}
        onDone={doneWeight}
        unitToggle={unitToggle(
          wtUnit,
          [
            { label: "lbs", value: "lbs" },
            { label: "kg", value: "kg" },
          ],
          (v) => {
            setWtUnit(v as "lbs" | "kg");
            setWtVal(v === "kg" ? 75 : 165);
          },
        )}
      >
        <View style={styles.pickerRow}>
          <Picker
            selectedValue={wtVal}
            onValueChange={setWtVal}
            style={[styles.picker, { flex: 1 }]}
            itemStyle={[styles.pickerItem, { color: colors.text }]}
          >
            {(wtUnit === "lbs" ? LB_VALUES : KG_VALUES).map((v) => (
              <Picker.Item key={v} label={`${v} ${wtUnit}`} value={v} />
            ))}
          </Picker>
        </View>
      </PickerSheet>

      {/* ── DOB Sheet ────────────────────────────────────── */}
      <PickerSheet
        visible={bdSheet}
        title="Date of birth"
        colors={colors}
        onClose={() => setBdSheet(false)}
        onDone={doneDOB}
      >
        <View style={styles.pickerRow}>
          <Picker
            selectedValue={bdMonth}
            onValueChange={handleBdMonthChange}
            style={[styles.picker, { flex: 1.4 }]}
            itemStyle={[styles.pickerItem, { color: colors.text }]}
          >
            {DOB_MONTHS.map((m, i) => (
              <Picker.Item key={i} label={m} value={i} />
            ))}
          </Picker>
          <Picker
            selectedValue={bdDay}
            onValueChange={setBdDay}
            style={[styles.picker, { flex: 0.8 }]}
            itemStyle={[styles.pickerItem, { color: colors.text }]}
          >
            {Array.from(
              { length: getDaysInMonth(bdMonth, bdYear) },
              (_, i) => i + 1,
            ).map((d) => (
              <Picker.Item key={d} label={`${d}`} value={d} />
            ))}
          </Picker>
          <Picker
            selectedValue={bdYear}
            onValueChange={handleBdYearChange}
            style={[styles.picker, { flex: 1.1 }]}
            itemStyle={[styles.pickerItem, { color: colors.text }]}
          >
            {DOB_YEARS.map((y) => (
              <Picker.Item key={y} label={`${y}`} value={y} />
            ))}
          </Picker>
        </View>
      </PickerSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  cardsWrap: {
    flex: 1,
    gap: 10,
  },
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
  pressed: {
    opacity: 0.75,
  },
  // ── Unit toggle ───────────────────────────────────────────
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
  // ── Pickers ───────────────────────────────────────────────
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
