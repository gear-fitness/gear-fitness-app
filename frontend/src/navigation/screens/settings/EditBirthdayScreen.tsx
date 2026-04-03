import React, { useState, useMemo } from "react";
import { View, Text, Alert, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../../context/AuthContext";
import { updateUserProfile } from "../../../api/userService";
import { DOB } from "../../onboarding/types";
import { calcAge } from "../../onboarding/calcAge";
import {
  DOB_MONTHS,
  DOB_MONTHS_SHORT,
  DOB_YEARS,
} from "../../onboarding/pickerConstants";
import { PickerSheet } from "../../onboarding/components/PickerSheet";
import { useOnboardingColors } from "../../onboarding/components/useOnboardingColors";
import { makeOnboardingStyles } from "../../onboarding/components/makeOnboardingStyles";
import { SettingsTopBar } from "../../../components/Settings/SettingsTopBar";

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function EditBirthdayScreen() {
  const navigation = useNavigation<any>();
  const { refreshUser } = useAuth();
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [dob, setDob] = useState<DOB | undefined>(undefined);

  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(1);
  const [year, setYear] = useState(2000);
  const [saving, setSaving] = useState(false);

  const handleMonthChange = (m: number) => {
    setMonth(m);
    const max = getDaysInMonth(m, year);
    if (day > max) setDay(max);
  };

  const handleYearChange = (y: number) => {
    setYear(y);
    const max = getDaysInMonth(month, y);
    if (day > max) setDay(max);
  };

  const handleDone = () => {
    setDob({ year, month, day });
    setSheetVisible(false);
  };

  const handleSave = async () => {
    if (!dob || saving) return;
    const age = calcAge(dob.year, dob.month, dob.day);
    setSaving(true);
    try {
      await updateUserProfile(undefined, undefined, age);
      await refreshUser();
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to update birthday. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const previewText = dob
    ? `${DOB_MONTHS_SHORT[dob.month]} ${dob.day}, ${dob.year}  ·  ${calcAge(dob.year, dob.month, dob.day)} years old`
    : "Tap to set your birthday";

  const canSave = !!dob && !saving;

  return (
    <View style={[shared.screen, { backgroundColor: colors.screenBg }]}>
      <SettingsTopBar
        title="Birthday"
        onBack={() => navigation.goBack()}
        onSave={handleSave}
        saveDisabled={!canSave}
      />
      <View style={shared.body}>
        <Text style={shared.heading}>When were you born?</Text>
        <Text style={shared.subheading}>
          Used to calculate your age for health metrics. Kept private and
          secure.
        </Text>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
          onPress={() => setSheetVisible(true)}
        >
          <Text style={[styles.cardLabel, { color: colors.secondary }]}>
            BIRTHDAY
          </Text>
          <Text
            style={[
              styles.cardValue,
              { color: dob ? colors.text : colors.secondary },
            ]}
          >
            {previewText}
          </Text>
          <Text style={[styles.tapHint, { color: colors.secondary }]}>
            Tap to change
          </Text>
        </Pressable>
      </View>
      <View style={shared.footer}>
        <Pressable
          style={[shared.continueBtn, !canSave && shared.continueBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={shared.continueBtnText}>
            {saving ? "Saving..." : "Save changes"}
          </Text>
        </Pressable>
      </View>

      <PickerSheet
        visible={sheetVisible}
        title="Date of birth"
        colors={colors}
        onClose={() => setSheetVisible(false)}
        onDone={handleDone}
      >
        <View style={styles.pickerRow}>
          <Picker
            selectedValue={month}
            onValueChange={handleMonthChange}
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
            onValueChange={handleYearChange}
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
  card: {
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  tapHint: {
    fontSize: 12,
    marginTop: 2,
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
