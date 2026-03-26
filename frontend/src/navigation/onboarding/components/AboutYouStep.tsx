import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Height, Weight, DOB } from "../types";
import { GlassPrimaryButton } from "./GlassPrimaryButton";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { GlassPickerSheet, PickerColumn, SegmentControl } from "./GlassPickerSheet";

// ─── Height data ───────────────────────────────────────────────
const FT_ITEMS = ["3'", "4'", "5'", "6'", "7'"];
const IN_ITEMS = Array.from({ length: 12 }, (_, i) => `${i}"`);
const CM_ITEMS = Array.from({ length: 121 }, (_, i) => `${i + 100} cm`);

// ─── Weight data ───────────────────────────────────────────────
const LB_ITEMS = Array.from({ length: 301 }, (_, i) => `${i + 50} lbs`);
const KG_ITEMS = Array.from({ length: 201 }, (_, i) => `${i + 20} kg`);

// ─── DOB data ──────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
const YEARS = Array.from({ length: 80 }, (_, i) => `${2007 - i}`);

function calcAge(year: number, month: number, day: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) age--;
  return Math.max(0, age);
}

function formatHeight(h?: Height): string {
  if (!h) return "5' 11\"";
  if (h.unit === "ft_in") return `${h.ft}' ${h.inch}"`;
  return `${h.cm} cm`;
}

function formatWeight(w?: Weight): string {
  if (!w) return "165 lbs";
  return `${w.value} ${w.unit}`;
}

function formatDOB(dob?: DOB): { age: string; date: string } {
  if (!dob) return { age: "25", date: "May 26, 2000" };
  const age = calcAge(dob.year, dob.month, dob.day);
  return {
    age: `${age}`,
    date: `${MONTHS_SHORT[dob.month]} ${dob.day}, ${dob.year}`,
  };
}

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
  const [htSheet, setHtSheet] = useState(false);
  const [wtSheet, setWtSheet] = useState(false);
  const [bdSheet, setBdSheet] = useState(false);

  // ─── Local picker state ────────────────────────────────────
  const [htUnit, setHtUnit] = useState<"ft_in" | "cm">(
    height?.unit === "cm" ? "cm" : "ft_in"
  );
  const [ftIdx, setFtIdx] = useState(
    height?.unit === "ft_in" ? Math.max(0, height.ft - 3) : 2
  );
  const [inIdx, setInIdx] = useState(
    height?.unit === "ft_in" ? Math.min(11, height.inch) : 11
  );
  const [cmIdx, setCmIdx] = useState(
    height?.unit === "cm" ? Math.max(0, height.cm - 100) : 70
  );

  const [wtUnit, setWtUnit] = useState<"lbs" | "kg">(
    weight?.unit === "kg" ? "kg" : "lbs"
  );
  const [wtIdx, setWtIdx] = useState(
    weight
      ? weight.unit === "lbs"
        ? Math.max(0, weight.value - 50)
        : Math.max(0, weight.value - 20)
      : 115
  );

  const [bdMoIdx, setBdMoIdx] = useState(dob?.month ?? 4);
  const [bdDaIdx, setBdDaIdx] = useState(dob ? dob.day - 1 : 25);
  const [bdYrIdx, setBdYrIdx] = useState(
    dob ? Math.max(0, 2007 - dob.year) : 7
  );

  const doneHeight = () => {
    const h: Height =
      htUnit === "ft_in"
        ? { unit: "ft_in", ft: ftIdx + 3, inch: inIdx }
        : { unit: "cm", cm: cmIdx + 100 };
    onHeightChange(h);
    setHtSheet(false);
  };

  const doneWeight = () => {
    const items = wtUnit === "lbs" ? LB_ITEMS : KG_ITEMS;
    const rawVal = wtUnit === "lbs" ? wtIdx + 50 : wtIdx + 20;
    const w: Weight = { unit: wtUnit, value: rawVal };
    onWeightChange(w);
    setWtSheet(false);
  };

  const doneDOB = () => {
    const year = 2007 - bdYrIdx;
    const d: DOB = { year, month: bdMoIdx, day: bdDaIdx + 1 };
    onDobChange(d);
    setBdSheet(false);
  };

  const { age, date } = formatDOB(dob);

  return (
    <View style={styles.screen}>
      <OnboardingTopBar progress={0.4} onBack={onBack} />
      <View style={styles.body}>
        <Text style={styles.heading}>About you</Text>
        <Text style={styles.subheading}>
          Helps us personalise your calorie goals and workout intensity.
        </Text>
        <View style={styles.cardsWrap}>
          <Pressable style={styles.bigCard} onPress={() => setHtSheet(true)}>
            <Text style={styles.cardLabel}>HEIGHT</Text>
            <Text style={styles.cardValue}>{formatHeight(height)}</Text>
            <Text style={styles.tapHint}>Tap to change</Text>
          </Pressable>
          <Pressable style={styles.bigCard} onPress={() => setWtSheet(true)}>
            <Text style={styles.cardLabel}>WEIGHT</Text>
            <Text style={styles.cardValue}>{formatWeight(weight)}</Text>
            <Text style={styles.tapHint}>Tap to change</Text>
          </Pressable>
          <Pressable style={styles.bigCard} onPress={() => setBdSheet(true)}>
            <Text style={styles.cardLabel}>AGE</Text>
            <Text style={styles.cardValue}>{age}</Text>
            <Text style={styles.cardSub}>{date}</Text>
            <Text style={styles.tapHint}>Tap to change</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.footer}>
        <GlassPrimaryButton label="Continue" onPress={onContinue} />
      </View>

      {/* Height Sheet */}
      <GlassPickerSheet
        visible={htSheet}
        title="Your height"
        onClose={() => setHtSheet(false)}
        headerContent={
          <SegmentControl
            options={[
              { label: "ft / in", value: "ft_in" },
              { label: "cm", value: "cm" },
            ]}
            selected={htUnit}
            onSelect={(v) => setHtUnit(v as "ft_in" | "cm")}
          />
        }
        pickerContent={
          <View style={styles.pickerColumns}>
            {htUnit === "ft_in" ? (
              <>
                <PickerColumn
                  items={FT_ITEMS}
                  selectedIndex={ftIdx}
                  onIndexChange={setFtIdx}
                  visible={htSheet}
                />
                <PickerColumn
                  items={IN_ITEMS}
                  selectedIndex={inIdx}
                  onIndexChange={setInIdx}
                  visible={htSheet}
                />
              </>
            ) : (
              <PickerColumn
                items={CM_ITEMS}
                selectedIndex={cmIdx}
                onIndexChange={setCmIdx}
                visible={htSheet}
              />
            )}
          </View>
        }
        rightAction={{ label: "Done", onPress: doneHeight }}
      />

      {/* Weight Sheet */}
      <GlassPickerSheet
        visible={wtSheet}
        title="Your weight"
        onClose={() => setWtSheet(false)}
        headerContent={
          <SegmentControl
            options={[
              { label: "lbs", value: "lbs" },
              { label: "kg", value: "kg" },
            ]}
            selected={wtUnit}
            onSelect={(v) => {
              setWtUnit(v as "lbs" | "kg");
              setWtIdx(v === "lbs" ? 115 : 65);
            }}
          />
        }
        pickerContent={
          <View style={styles.pickerColumns}>
            <PickerColumn
              items={wtUnit === "lbs" ? LB_ITEMS : KG_ITEMS}
              selectedIndex={wtIdx}
              onIndexChange={setWtIdx}
              visible={wtSheet}
            />
          </View>
        }
        rightAction={{ label: "Done", onPress: doneWeight }}
      />

      {/* DOB Sheet */}
      <GlassPickerSheet
        visible={bdSheet}
        title="Date of birth"
        onClose={() => setBdSheet(false)}
        pickerContent={
          <>
            <PickerColumn
              items={MONTHS}
              selectedIndex={bdMoIdx}
              onIndexChange={setBdMoIdx}
              flex={1.4}
              visible={bdSheet}
            />
            <PickerColumn
              items={DAYS}
              selectedIndex={bdDaIdx}
              onIndexChange={setBdDaIdx}
              flex={0.8}
              visible={bdSheet}
            />
            <PickerColumn
              items={YEARS}
              selectedIndex={bdYrIdx}
              onIndexChange={setBdYrIdx}
              flex={1.1}
              visible={bdSheet}
            />
          </>
        }
        rightAction={{ label: "Done", onPress: doneDOB }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  heading: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0D0D0D",
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 5,
  },
  subheading: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 21,
    marginBottom: 24,
  },
  cardsWrap: {
    flex: 1,
    gap: 10,
  },
  bigCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.7,
    color: "#8E8E93",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#0D0D0D",
    letterSpacing: -2,
    lineHeight: 52,
  },
  cardSub: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 4,
  },
  tapHint: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 5,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 10,
  },
  pickerColumns: {
    flexDirection: "row",
    height: "100%",
  },
});
