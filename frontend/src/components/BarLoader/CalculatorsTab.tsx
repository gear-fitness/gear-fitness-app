import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Text, TextInput } from "../Text";
import { useThemeColors } from "../../hooks/useThemeColors";
import { LBS_PER_KG, WeightUnit } from "../../utils/weight";
import {
  REP_VALUES,
  RPE_VALUES,
  Sex,
  dotsScore,
  estimateE1RM,
  formatNumber,
  ipfGLScore,
  weightForTarget,
  wilks2020Score,
} from "../../utils/plateMath";
import { GlassCard } from "./GlassCard";
import { barLoaderSession } from "./sessionStore";

type Props = {
  unit: WeightUnit;
  onLoadBar: (weight: number) => void;
};

const PERCENT_ROWS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];

function parseInput(value: string): number | null {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Horizontal chip row for picking reps or RPE. */
function ChipRow<T extends number>({
  values,
  selected,
  onSelect,
  format,
}: {
  values: readonly T[];
  selected: T;
  onSelect: (v: T) => void;
  format?: (v: T) => string;
}) {
  const t = useThemeColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {values.map((v) => {
        const active = v === selected;
        return (
          <TouchableOpacity
            key={v}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onSelect(v);
            }}
            style={[
              styles.chip,
              {
                borderColor: active ? t.text : t.border,
                backgroundColor: active ? t.text : "transparent",
              },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? t.bg : t.text }]}>
              {format ? format(v) : String(v)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function FieldLabel({ children }: { children: string }) {
  const t = useThemeColors();
  return (
    <Text style={[styles.fieldLabel, { color: t.secondary }]}>{children}</Text>
  );
}

/**
 * The Calculators tab: RPE / e1RM, percent table, and points. The RPE
 * card's e1RM feeds the percent table's "use e1RM" shortcut, and both
 * can send a weight straight to the plate calculator via onLoadBar.
 */
export function CalculatorsTab({ unit, onLoadBar }: Props) {
  const t = useThemeColors();

  // All inputs seed from the in-memory session store and write through
  // below, so a lifter's numbers survive leaving the screen between sets.

  // RPE / e1RM
  const [lastWeight, setLastWeight] = useState(barLoaderSession.lastWeight);
  const [lastReps, setLastReps] = useState(barLoaderSession.lastReps);
  const [lastRpe, setLastRpe] = useState(barLoaderSession.lastRpe);
  const [nextReps, setNextReps] = useState(barLoaderSession.nextReps);
  const [nextRpe, setNextRpe] = useState(barLoaderSession.nextRpe);

  const e1rm = useMemo(() => {
    const weight = parseInput(lastWeight);
    return weight ? estimateE1RM(weight, lastReps, lastRpe) : null;
  }, [lastWeight, lastReps, lastRpe]);

  const nextWeight = useMemo(
    () => (e1rm ? weightForTarget(e1rm, nextReps, nextRpe) : null),
    [e1rm, nextReps, nextRpe],
  );

  // Percent table
  const [percentBase, setPercentBase] = useState(barLoaderSession.percentBase);
  const base = parseInput(percentBase);

  // Points
  const [sex, setSex] = useState<Sex>(barLoaderSession.sex);
  const [bodyweight, setBodyweight] = useState(barLoaderSession.bodyweight);
  const [total, setTotal] = useState(barLoaderSession.total);

  useEffect(() => {
    barLoaderSession.lastWeight = lastWeight;
    barLoaderSession.lastReps = lastReps;
    barLoaderSession.lastRpe = lastRpe;
    barLoaderSession.nextReps = nextReps;
    barLoaderSession.nextRpe = nextRpe;
    barLoaderSession.percentBase = percentBase;
    barLoaderSession.sex = sex;
    barLoaderSession.bodyweight = bodyweight;
    barLoaderSession.total = total;
  }, [
    lastWeight,
    lastReps,
    lastRpe,
    nextReps,
    nextRpe,
    percentBase,
    sex,
    bodyweight,
    total,
  ]);

  const points = useMemo(() => {
    const bw = parseInput(bodyweight);
    const tot = parseInput(total);
    if (!bw || !tot) return null;
    const bwKg = unit === "kg" ? bw : bw / LBS_PER_KG;
    const totKg = unit === "kg" ? tot : tot / LBS_PER_KG;
    return {
      dots: dotsScore(totKg, bwKg, sex),
      wilks: wilks2020Score(totKg, bwKg, sex),
      ipfGL: ipfGLScore(totKg, bwKg, sex),
    };
  }, [bodyweight, total, sex, unit]);

  const loadBar = (weight: number) => {
    Haptics.selectionAsync().catch(() => {});
    onLoadBar(Math.round(weight * 10) / 10);
  };

  const unitSuffix = unit.toUpperCase();

  return (
    <View style={styles.container}>
      {/* RPE / e1RM */}
      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: t.text }]}>RPE / e1RM</Text>

        <FieldLabel>LAST SET</FieldLabel>
        <View style={styles.inputRow}>
          <TextInput
            value={lastWeight}
            onChangeText={setLastWeight}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={t.secondary}
            maxLength={7}
            selectTextOnFocus
            style={[
              styles.weightInput,
              { color: t.text, borderColor: t.border },
            ]}
          />
          <Text style={[styles.inputUnit, { color: t.secondary }]}>
            {unitSuffix}
          </Text>
        </View>
        <ChipRow
          values={REP_VALUES}
          selected={lastReps}
          onSelect={setLastReps}
          format={(v) => `${v} rep${v === 1 ? "" : "s"}`}
        />
        <ChipRow
          values={RPE_VALUES}
          selected={lastRpe}
          onSelect={setLastRpe}
          format={(v) => `@${v}`}
        />

        <View style={[styles.resultRow, { borderTopColor: t.separator }]}>
          <Text style={[styles.resultLabel, { color: t.secondary }]}>
            ESTIMATED 1RM
          </Text>
          <Text style={[styles.resultValue, { color: t.text }]}>
            {e1rm
              ? `${formatNumber(Math.round(e1rm * 10) / 10)} ${unit}`
              : "--"}
          </Text>
        </View>

        <FieldLabel>NEXT SET</FieldLabel>
        <ChipRow
          values={REP_VALUES}
          selected={nextReps}
          onSelect={setNextReps}
          format={(v) => `${v} rep${v === 1 ? "" : "s"}`}
        />
        <ChipRow
          values={RPE_VALUES}
          selected={nextRpe}
          onSelect={setNextRpe}
          format={(v) => `@${v}`}
        />

        <View style={[styles.resultRow, { borderTopColor: t.separator }]}>
          <Text style={[styles.resultLabel, { color: t.secondary }]}>
            WORKING WEIGHT
          </Text>
          <Text style={[styles.resultValue, { color: t.text }]}>
            {nextWeight
              ? `${formatNumber(Math.round(nextWeight * 10) / 10)} ${unit}`
              : "--"}
          </Text>
        </View>
        {nextWeight != null && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => loadBar(nextWeight)}
            style={[styles.loadBtn, { borderColor: t.text }]}
          >
            <Text style={[styles.loadBtnText, { color: t.text }]}>
              Load the Bar
            </Text>
          </TouchableOpacity>
        )}
      </GlassCard>

      {/* Percent table */}
      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: t.text }]}>Percent Table</Text>
        <FieldLabel>BASE WEIGHT</FieldLabel>
        <View style={styles.inputRow}>
          <TextInput
            value={percentBase}
            onChangeText={setPercentBase}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={t.secondary}
            maxLength={7}
            selectTextOnFocus
            style={[
              styles.weightInput,
              { color: t.text, borderColor: t.border },
            ]}
          />
          <Text style={[styles.inputUnit, { color: t.secondary }]}>
            {unitSuffix}
          </Text>
          {e1rm != null && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setPercentBase(formatNumber(Math.round(e1rm * 10) / 10));
              }}
              style={[styles.e1rmChip, { borderColor: t.border }]}
            >
              <Text style={[styles.chipText, { color: t.text }]}>Use e1RM</Text>
            </TouchableOpacity>
          )}
        </View>
        {base != null &&
          PERCENT_ROWS.map((pct) => {
            const weight = (base * pct) / 100;
            return (
              <TouchableOpacity
                key={pct}
                activeOpacity={0.7}
                onPress={() => loadBar(weight)}
                style={[styles.pctRow, { borderTopColor: t.separator }]}
              >
                <Text style={[styles.pctLabel, { color: t.secondary }]}>
                  {pct}%
                </Text>
                <Text style={[styles.pctWeight, { color: t.text }]}>
                  {formatNumber(Math.round(weight * 10) / 10)} {unit}
                </Text>
                <Text style={[styles.pctLoad, { color: t.secondary }]}>
                  Load
                </Text>
              </TouchableOpacity>
            );
          })}
      </GlassCard>

      {/* Points */}
      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: t.text }]}>Points</Text>
        <View style={[styles.unitToggle, { backgroundColor: t.unitToggleBg }]}>
          {(["male", "female"] as Sex[]).map((s) => (
            <TouchableOpacity
              key={s}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSex(s);
              }}
              style={[
                styles.unitBtn,
                s === sex && { backgroundColor: t.unitBtnActiveBg },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: s === sex ? t.text : t.secondary },
                ]}
              >
                {s === "male" ? "Male" : "Female"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.pointsInputs}>
          <View style={styles.pointsField}>
            <FieldLabel>BODYWEIGHT</FieldLabel>
            <View style={styles.inputRow}>
              <TextInput
                value={bodyweight}
                onChangeText={setBodyweight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={t.secondary}
                maxLength={6}
                selectTextOnFocus
                style={[
                  styles.weightInput,
                  { color: t.text, borderColor: t.border },
                ]}
              />
              <Text style={[styles.inputUnit, { color: t.secondary }]}>
                {unitSuffix}
              </Text>
            </View>
          </View>
          <View style={styles.pointsField}>
            <FieldLabel>TOTAL</FieldLabel>
            <View style={styles.inputRow}>
              <TextInput
                value={total}
                onChangeText={setTotal}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={t.secondary}
                maxLength={7}
                selectTextOnFocus
                style={[
                  styles.weightInput,
                  { color: t.text, borderColor: t.border },
                ]}
              />
              <Text style={[styles.inputUnit, { color: t.secondary }]}>
                {unitSuffix}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pointsResults}>
          {(
            [
              ["DOTS", points?.dots],
              ["WILKS", points?.wilks],
              ["IPF GL", points?.ipfGL],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={styles.pointsResult}>
              <Text style={[styles.resultLabel, { color: t.secondary }]}>
                {label}
              </Text>
              <Text style={[styles.pointsValue, { color: t.text }]}>
                {value ? formatNumber(Math.round(value * 100) / 100) : "--"}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[styles.pointsCaption, { color: t.secondary }]}>
          Raw SBD coefficients. Wilks uses the 2020 formula.
        </Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  card: {
    padding: 18,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  weightInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 17,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  inputUnit: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  chipRow: {
    gap: 6,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  e1rmChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    marginBottom: 12,
    paddingTop: 12,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  loadBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  loadBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  pctRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
  },
  pctLabel: {
    width: 52,
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  pctWeight: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  pctLoad: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  unitToggle: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
    marginBottom: 14,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
  },
  pointsInputs: {
    flexDirection: "row",
    gap: 12,
  },
  pointsField: {
    flex: 1,
  },
  pointsResults: {
    flexDirection: "row",
    marginTop: 6,
  },
  pointsResult: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  pointsCaption: {
    fontSize: 11,
    marginTop: 12,
    textAlign: "center",
  },
});
