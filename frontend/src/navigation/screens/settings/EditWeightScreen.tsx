import React, { useState, useMemo } from "react";
import { View, Text, Alert, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../../context/AuthContext";
import { updateUserProfile } from "../../../api/userService";
import { Weight } from "../../onboarding/types";
import { LB_VALUES, KG_VALUES } from "../../onboarding/pickerConstants";
import { PickerSheet } from "../../onboarding/components/PickerSheet";
import { useOnboardingColors } from "../../onboarding/components/useOnboardingColors";
import { makeOnboardingStyles } from "../../onboarding/components/makeOnboardingStyles";
import { FloatingCloseButton } from "../../../components/FloatingCloseButton";
import { syncOnboardingDataToHealthKit } from "../../../utils/healthKitSync";

function toWeightLbs(w: Weight): number {
  if (w.unit === "lbs") return w.value;
  return Math.round(w.value * 2.205);
}

function formatWeight(w?: Weight): string {
  if (!w) return "Tap to set";
  return `${w.value} ${w.unit}`;
}

export function EditWeightScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const colors = useOnboardingColors();
  const insets = useSafeAreaInsets();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const initialLbs = user?.weightLbs;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [weight, setWeight] = useState<Weight | undefined>(
    initialLbs ? { unit: "lbs", value: initialLbs } : undefined,
  );
  const [wtUnit, setWtUnit] = useState<"lbs" | "kg">("lbs");
  const [wtVal, setWtVal] = useState(initialLbs ?? 165);
  const [saving, setSaving] = useState(false);

  const handleDone = () => {
    setWeight({ unit: wtUnit, value: wtVal });
    setSheetVisible(false);
  };

  const handleSave = async () => {
    if (!weight || saving) return;
    setSaving(true);
    try {
      await updateUserProfile(undefined, toWeightLbs(weight));
      await refreshUser();
      syncOnboardingDataToHealthKit({ weight });
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to update weight. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!weight && !saving;

  const unitToggle = (
    <View style={[styles.unitToggle, { backgroundColor: colors.unitToggleBg }]}>
      {(["lbs", "kg"] as const).map((u) => (
        <Pressable
          key={u}
          onPress={() => {
            setWtUnit(u);
            setWtVal(u === "kg" ? 75 : 165);
          }}
          style={[
            styles.unitBtn,
            wtUnit === u && { backgroundColor: colors.unitBtnActiveBg },
          ]}
        >
          <Text
            style={[
              styles.unitBtnText,
              { color: wtUnit === u ? colors.text : colors.secondary },
            ]}
          >
            {u}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={[shared.screen, { backgroundColor: colors.screenBg }]}>
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      <View style={[shared.body, { paddingTop: insets.top + 60 }]}>
        <Text style={shared.heading}>How much do you weigh?</Text>
        <Text style={shared.subheading}>
          Helps calibrate your calorie burn and workout intensity.
        </Text>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
          onPress={() => setSheetVisible(true)}
        >
          <Text style={[styles.cardLabel, { color: colors.secondary }]}>
            WEIGHT
          </Text>
          <Text
            style={[
              styles.cardValue,
              { color: weight ? colors.text : colors.secondary },
            ]}
          >
            {formatWeight(weight)}
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
        title="Your weight"
        colors={colors}
        onClose={() => setSheetVisible(false)}
        onDone={handleDone}
        unitToggle={unitToggle}
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
