import React, { useState, useMemo } from "react";
import { View, Text, Alert, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../../context/AuthContext";
import { updateUserProfile } from "../../../api/userService";
import { Height } from "../../onboarding/types";
import {
  FT_VALUES,
  IN_VALUES,
  CM_VALUES,
} from "../../onboarding/pickerConstants";
import { PickerSheet } from "../../onboarding/components/PickerSheet";
import { useOnboardingColors } from "../../onboarding/components/useOnboardingColors";
import { makeOnboardingStyles } from "../../onboarding/components/makeOnboardingStyles";
import { FloatingCloseButton } from "../../../components/FloatingCloseButton";
import { syncOnboardingDataToHealthKit } from "../../../utils/healthKitSync";

function toHeightInches(h: Height): number {
  if (h.unit === "ft_in") return h.ft * 12 + h.inch;
  return Math.round(h.cm / 2.54);
}

function formatHeight(h?: Height): string {
  if (!h) return "Tap to set";
  if (h.unit === "ft_in") return `${h.ft}' ${h.inch}"`;
  return `${h.cm} cm`;
}

export function EditHeightScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const colors = useOnboardingColors();
  const insets = useSafeAreaInsets();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const initialInches = user?.heightInches;
  const initialFt = initialInches ? Math.floor(initialInches / 12) : 5;
  const initialIn = initialInches ? initialInches % 12 : 11;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [height, setHeight] = useState<Height | undefined>(
    initialInches
      ? { unit: "ft_in", ft: initialFt, inch: initialIn }
      : undefined,
  );
  const [htUnit, setHtUnit] = useState<"ft_in" | "cm">("ft_in");
  const [htFt, setHtFt] = useState(initialFt);
  const [htIn, setHtIn] = useState(initialIn);
  const [htCm, setHtCm] = useState(
    initialInches ? Math.round(initialInches * 2.54) : 170,
  );
  const [saving, setSaving] = useState(false);

  const handleDone = () => {
    setHeight(
      htUnit === "ft_in"
        ? { unit: "ft_in", ft: htFt, inch: htIn }
        : { unit: "cm", cm: htCm },
    );
    setSheetVisible(false);
  };

  const handleSave = async () => {
    if (!height || saving) return;
    setSaving(true);
    try {
      await updateUserProfile(toHeightInches(height));
      await refreshUser();
      syncOnboardingDataToHealthKit({ height });
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to update height. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!height && !saving;

  const unitToggle = (
    <View style={[styles.unitToggle, { backgroundColor: colors.unitToggleBg }]}>
      {(["ft_in", "cm"] as const).map((u) => (
        <Pressable
          key={u}
          onPress={() => setHtUnit(u)}
          style={[
            styles.unitBtn,
            htUnit === u && { backgroundColor: colors.unitBtnActiveBg },
          ]}
        >
          <Text
            style={[
              styles.unitBtnText,
              { color: htUnit === u ? colors.text : colors.secondary },
            ]}
          >
            {u === "ft_in" ? "ft / in" : "cm"}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={[shared.screen, { backgroundColor: colors.screenBg }]}>
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      <View style={[shared.body, { paddingTop: insets.top + 60 }]}>
        <Text style={shared.heading}>How tall are you?</Text>
        <Text style={shared.subheading}>
          Helps calibrate your workout intensity and calorie goals.
        </Text>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
          onPress={() => setSheetVisible(true)}
        >
          <Text style={[styles.cardLabel, { color: colors.secondary }]}>
            HEIGHT
          </Text>
          <Text
            style={[
              styles.cardValue,
              { color: height ? colors.text : colors.secondary },
            ]}
          >
            {formatHeight(height)}
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
        title="Your height"
        colors={colors}
        onClose={() => setSheetVisible(false)}
        onDone={handleDone}
        unitToggle={unitToggle}
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
    gap: 4,
    minHeight: 140,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -2,
    lineHeight: 52,
  },
  tapHint: {
    fontSize: 12,
    marginTop: 4,
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
