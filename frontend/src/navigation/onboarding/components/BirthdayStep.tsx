import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { DOB_MONTHS, DOB_YEARS } from "../pickerConstants";

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function BirthdayStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const [month, setMonth] = useState(draft.dob?.month ?? 4);
  const [day, setDay] = useState(draft.dob?.day ?? 15);
  const [year, setYear] = useState(draft.dob?.year ?? 2000);

  const clampDay = (m: number, y: number) => {
    const max = getDaysInMonth(m, y);
    if (day > max) setDay(max);
  };

  const handleContinue = () => {
    updateDraft({ dob: { year, month, day } });
    onNext();
  };

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      onContinue={handleContinue}
    >
      <View style={styles.center}>
        <Text style={[shared.heading, styles.heading]}>
          When were you born?
        </Text>
        <View style={styles.pickerRow}>
          <Picker
            selectedValue={month}
            onValueChange={(m: number) => {
              setMonth(m);
              clampDay(m, year);
            }}
            style={[styles.picker, { flex: 1.4 }]}
            itemStyle={[styles.pickerItem, { color: colors.text }]}
          >
            {DOB_MONTHS.map((m, i) => (
              <Picker.Item key={i} label={m} value={i} />
            ))}
          </Picker>
          <Picker
            selectedValue={day}
            onValueChange={setDay}
            style={[styles.picker, { flex: 0.8 }]}
            itemStyle={[styles.pickerItem, { color: colors.text }]}
          >
            {Array.from(
              { length: getDaysInMonth(month, year) },
              (_, i) => i + 1,
            ).map((d) => (
              <Picker.Item key={d} label={`${d}`} value={d} />
            ))}
          </Picker>
          <Picker
            selectedValue={year}
            onValueChange={(y: number) => {
              setYear(y);
              clampDay(month, y);
            }}
            style={[styles.picker, { flex: 1.1 }]}
            itemStyle={[styles.pickerItem, { color: colors.text }]}
          >
            {DOB_YEARS.map((y) => (
              <Picker.Item key={y} label={`${y}`} value={y} />
            ))}
          </Picker>
        </View>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
  },
  heading: {
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  picker: {
    flex: 1,
    height: 216,
  },
  pickerItem: {
    fontSize: 18,
  },
});
