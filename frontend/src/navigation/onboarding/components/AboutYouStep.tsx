import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Height, Weight, DOB } from "../types";
import { OnboardingTopBar } from "./OnboardingTopBar";

// ─── Helpers ───────────────────────────────────────────────────
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
  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (!dob) return { age: "25", date: "May 26, 2000" };
  const age = calcAge(dob.year, dob.month, dob.day);
  return { age: `${age}`, date: `${MONTHS_SHORT[dob.month]} ${dob.day}, ${dob.year}` };
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ─── DOB picker data ───────────────────────────────────────────
const DOB_MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DOB_YEARS = Array.from({ length: 80 }, (_, i) => 2007 - i);

// ─── Height picker data ────────────────────────────────────────
const FT_VALUES = [3, 4, 5, 6, 7];
const IN_VALUES = Array.from({ length: 12 }, (_, i) => i);
const CM_VALUES = Array.from({ length: 121 }, (_, i) => i + 100);

// ─── Weight picker data ────────────────────────────────────────
const LB_VALUES = Array.from({ length: 301 }, (_, i) => i + 50);
const KG_VALUES = Array.from({ length: 201 }, (_, i) => i + 20);

const SHEET_TRANSLATE_CLOSED = 500;

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

  // ─── Per-sheet animation values ───────────────────────────
  const htBackdrop = useRef(new Animated.Value(0)).current;
  const htSlide    = useRef(new Animated.Value(SHEET_TRANSLATE_CLOSED)).current;
  const wtBackdrop = useRef(new Animated.Value(0)).current;
  const wtSlide    = useRef(new Animated.Value(SHEET_TRANSLATE_CLOSED)).current;
  const bdBackdrop = useRef(new Animated.Value(0)).current;
  const bdSlide    = useRef(new Animated.Value(SHEET_TRANSLATE_CLOSED)).current;

  // ─── Animation helpers ────────────────────────────────────
  const animOpen = (backdrop: Animated.Value, slide: Animated.Value) => {
    backdrop.setValue(0);
    slide.setValue(SHEET_TRANSLATE_CLOSED);
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
    ]).start();
  };

  const animClose = (
    backdrop: Animated.Value,
    slide: Animated.Value,
    done: () => void
  ) => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slide, { toValue: SHEET_TRANSLATE_CLOSED, duration: 220, useNativeDriver: true }),
    ]).start(() => done());
  };

  // ─── Open handlers ────────────────────────────────────────
  const openHt = () => { setHtSheet(true); animOpen(htBackdrop, htSlide); };
  const openWt = () => { setWtSheet(true); animOpen(wtBackdrop, wtSlide); };
  const openBd = () => { setBdSheet(true); animOpen(bdBackdrop, bdSlide); };

  // ─── Close handlers ──────────────────────────────────────
  const closeHt = (cb?: () => void) => animClose(htBackdrop, htSlide, () => { setHtSheet(false); cb?.(); });
  const closeWt = (cb?: () => void) => animClose(wtBackdrop, wtSlide, () => { setWtSheet(false); cb?.(); });
  const closeBd = (cb?: () => void) => animClose(bdBackdrop, bdSlide, () => { setBdSheet(false); cb?.(); });

  // ─── Height local state ────────────────────────────────────
  const [htUnit, setHtUnit] = useState<"ft_in" | "cm">(
    height?.unit === "cm" ? "cm" : "ft_in"
  );
  const [htFt, setHtFt] = useState(height?.unit === "ft_in" ? height.ft : 5);
  const [htIn, setHtIn] = useState(height?.unit === "ft_in" ? height.inch : 11);
  const [htCm, setHtCm] = useState(height?.unit === "cm" ? height.cm : 170);

  // ─── Weight local state ────────────────────────────────────
  const [wtUnit, setWtUnit] = useState<"lbs" | "kg">(
    weight?.unit === "kg" ? "kg" : "lbs"
  );
  const [wtVal, setWtVal] = useState(weight ? weight.value : 165);

  // ─── DOB local state ──────────────────────────────────────
  const [bdMonth, setBdMonth] = useState(dob?.month ?? 4);
  const [bdDay,   setBdDay]   = useState(dob?.day ?? 26);
  const [bdYear,  setBdYear]  = useState(dob?.year ?? 2000);

  // ─── Done handlers ────────────────────────────────────────
  const doneHeight = () =>
    closeHt(() => {
      onHeightChange(
        htUnit === "ft_in"
          ? { unit: "ft_in", ft: htFt, inch: htIn }
          : { unit: "cm", cm: htCm }
      );
    });

  const doneWeight = () =>
    closeWt(() => onWeightChange({ unit: wtUnit, value: wtVal }));

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

  const doneDOB = () =>
    closeBd(() => onDobChange({ year: bdYear, month: bdMonth, day: bdDay }));

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
          <Pressable style={styles.bigCard} onPress={openHt}>
            <Text style={styles.cardLabel}>HEIGHT</Text>
            <Text style={styles.cardValue}>{formatHeight(height)}</Text>
            <Text style={styles.tapHint}>Tap to change</Text>
          </Pressable>
          <Pressable style={styles.bigCard} onPress={openWt}>
            <Text style={styles.cardLabel}>WEIGHT</Text>
            <Text style={styles.cardValue}>{formatWeight(weight)}</Text>
            <Text style={styles.tapHint}>Tap to change</Text>
          </Pressable>
          <Pressable style={styles.bigCard} onPress={openBd}>
            <Text style={styles.cardLabel}>AGE</Text>
            <Text style={styles.cardValue}>{age}</Text>
            <Text style={styles.cardSub}>{date}</Text>
            <Text style={styles.tapHint}>Tap to change</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity onPress={onContinue} activeOpacity={0.8} style={styles.continueBtn}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* ── Height Sheet ─────────────────────────────────────── */}
      <Modal visible={htSheet} transparent animationType="none" onRequestClose={() => closeHt()}>
        <TouchableWithoutFeedback onPress={() => closeHt()}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, styles.dim, { opacity: htBackdrop }]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: htSlide }] }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTop}>
            <Text style={styles.sheetTitle}>Your height</Text>
            <TouchableOpacity onPress={doneHeight}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.unitToggle}>
            <TouchableOpacity
              onPress={() => setHtUnit("ft_in")}
              style={[styles.unitBtn, htUnit === "ft_in" && styles.unitBtnActive]}
            >
              <Text style={[styles.unitBtnText, htUnit === "ft_in" && styles.unitBtnTextActive]}>
                ft / in
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHtUnit("cm")}
              style={[styles.unitBtn, htUnit === "cm" && styles.unitBtnActive]}
            >
              <Text style={[styles.unitBtnText, htUnit === "cm" && styles.unitBtnTextActive]}>
                cm
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerRow}>
            {htUnit === "ft_in" ? (
              <>
                <Picker selectedValue={htFt} onValueChange={setHtFt} style={styles.picker} itemStyle={styles.pickerItem}>
                  {FT_VALUES.map((v) => <Picker.Item key={v} label={`${v} ft`} value={v} />)}
                </Picker>
                <Picker selectedValue={htIn} onValueChange={setHtIn} style={styles.picker} itemStyle={styles.pickerItem}>
                  {IN_VALUES.map((v) => <Picker.Item key={v} label={`${v} in`} value={v} />)}
                </Picker>
              </>
            ) : (
              <Picker selectedValue={htCm} onValueChange={setHtCm} style={[styles.picker, { flex: 1 }]} itemStyle={styles.pickerItem}>
                {CM_VALUES.map((v) => <Picker.Item key={v} label={`${v} cm`} value={v} />)}
              </Picker>
            )}
          </View>
          <TouchableOpacity onPress={doneHeight} style={styles.sheetDoneBtn}>
            <Text style={styles.sheetDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* ── Weight Sheet ─────────────────────────────────────── */}
      <Modal visible={wtSheet} transparent animationType="none" onRequestClose={() => closeWt()}>
        <TouchableWithoutFeedback onPress={() => closeWt()}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, styles.dim, { opacity: wtBackdrop }]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: wtSlide }] }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTop}>
            <Text style={styles.sheetTitle}>Your weight</Text>
            <TouchableOpacity onPress={doneWeight}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.unitToggle}>
            <TouchableOpacity
              onPress={() => { setWtUnit("lbs"); setWtVal(165); }}
              style={[styles.unitBtn, wtUnit === "lbs" && styles.unitBtnActive]}
            >
              <Text style={[styles.unitBtnText, wtUnit === "lbs" && styles.unitBtnTextActive]}>lbs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setWtUnit("kg"); setWtVal(75); }}
              style={[styles.unitBtn, wtUnit === "kg" && styles.unitBtnActive]}
            >
              <Text style={[styles.unitBtnText, wtUnit === "kg" && styles.unitBtnTextActive]}>kg</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerRow}>
            <Picker selectedValue={wtVal} onValueChange={setWtVal} style={[styles.picker, { flex: 1 }]} itemStyle={styles.pickerItem}>
              {(wtUnit === "lbs" ? LB_VALUES : KG_VALUES).map((v) => (
                <Picker.Item key={v} label={`${v} ${wtUnit}`} value={v} />
              ))}
            </Picker>
          </View>
          <TouchableOpacity onPress={doneWeight} style={styles.sheetDoneBtn}>
            <Text style={styles.sheetDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* ── DOB Sheet ────────────────────────────────────────── */}
      <Modal visible={bdSheet} transparent animationType="none" onRequestClose={() => closeBd()}>
        <TouchableWithoutFeedback onPress={() => closeBd()}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, styles.dim, { opacity: bdBackdrop }]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: bdSlide }] }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTop}>
            <Text style={styles.sheetTitle}>Date of birth</Text>
            <TouchableOpacity onPress={doneDOB}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerRow}>
            <Picker
              selectedValue={bdMonth}
              onValueChange={handleBdMonthChange}
              style={[styles.picker, { flex: 1.4 }]}
              itemStyle={styles.pickerItem}
            >
              {DOB_MONTHS.map((m, i) => <Picker.Item key={i} label={m} value={i} />)}
            </Picker>
            <Picker
              selectedValue={bdDay}
              onValueChange={setBdDay}
              style={[styles.picker, { flex: 0.8 }]}
              itemStyle={styles.pickerItem}
            >
              {Array.from({ length: getDaysInMonth(bdMonth, bdYear) }, (_, i) => i + 1).map((d) => (
                <Picker.Item key={d} label={`${d}`} value={d} />
              ))}
            </Picker>
            <Picker
              selectedValue={bdYear}
              onValueChange={handleBdYearChange}
              style={[styles.picker, { flex: 1.1 }]}
              itemStyle={styles.pickerItem}
            >
              {DOB_YEARS.map((y) => <Picker.Item key={y} label={`${y}`} value={y} />)}
            </Picker>
          </View>
          <TouchableOpacity onPress={doneDOB} style={styles.sheetDoneBtn}>
            <Text style={styles.sheetDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
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
  continueBtn: {
    height: 60,
    borderRadius: 999,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  // ── Sheet ─────────────────────────────────────────────────
  dim: {
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 99,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0D0D0D",
  },
  doneText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0D0D0D",
  },
  unitToggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "rgba(0,0,0,0.07)",
    borderRadius: 999,
    padding: 3,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
  },
  unitBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8E8E93",
  },
  unitBtnTextActive: {
    color: "#0D0D0D",
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
    color: "#0D0D0D",
    fontSize: 18,
  },
  sheetDoneBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDoneBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
