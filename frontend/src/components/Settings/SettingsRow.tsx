import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ColorValue,
} from "react-native";
import { useTheme } from "@react-navigation/native";

type Props = {
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  textColor?: ColorValue;
};

export default function SettingsRow({
  label,
  value,
  onPress,
  showArrow = true,
  textColor = "#000",
}: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>

        <View style={styles.right}>
          {value && (
            <Text style={[styles.value, { color: textColor }]}>{value}</Text>
          )}

          {showArrow && <Text style={styles.arrow}>{">"}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },

  label: {
    fontSize: 16,
    fontWeight: "500",
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
  },

  value: {
    marginRight: 8,
    fontSize: 15,
    opacity: 0.8,
  },

  arrow: {
    color: "#888",
    fontSize: 16,
    marginLeft: 4,
  },
});
