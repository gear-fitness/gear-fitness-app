import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "../BackButton";
import { useThemeColors } from "../../hooks/useThemeColors";

interface SettingsTopBarProps {
  title: string;
  onBack: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
}

export function SettingsTopBar({
  title,
  onBack,
  onSave,
  saveDisabled,
}: SettingsTopBarProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, borderBottomColor: colors.border },
      ]}
    >
      <BackButton onPress={onBack} color={colors.text} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {onSave ? (
        <TouchableOpacity
          onPress={onSave}
          disabled={saveDisabled}
          style={styles.saveWrap}
        >
          <Text
            style={[
              styles.save,
              { color: saveDisabled ? colors.secondary : colors.text },
            ]}
          >
            Save
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.saveWrap} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  saveWrap: {
    width: 44,
    alignItems: "flex-end",
  },
  save: {
    fontSize: 17,
    fontWeight: "600",
  },
});
