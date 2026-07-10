import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { BottomSheet } from "./BottomSheet";

type Visibility = "PUBLIC" | "FRIENDS" | "PRIVATE";

interface Props {
  visible: boolean;
  current: Visibility;
  onSelect: (v: Visibility) => void;
  onClose: () => void;
}

const OPTIONS: { value: Visibility; label: string; subtitle?: string }[] = [
  { value: "PUBLIC", label: "Everyone" },
  { value: "FRIENDS", label: "Friends", subtitle: "Followers you follow back" },
  { value: "PRIVATE", label: "Only you" },
];

export function PostVisibilitySheet({
  visible,
  current,
  onSelect,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const accent = "#ff4d2e";

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Who can see this post
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {OPTIONS.map((opt) => {
        const isSelected = current === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.7}
            onPress={() => onSelect(opt.value)}
            style={[styles.row, { borderBottomColor: colors.border }]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {opt.label}
              </Text>
              {opt.subtitle && (
                <Text style={[styles.rowSub, { color: colors.text + "80" }]}>
                  {opt.subtitle}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.radio,
                {
                  borderColor: isSelected ? accent : colors.text + "40",
                  backgroundColor: isSelected ? accent : "transparent",
                },
              ]}
            >
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowSub: {
    fontSize: 13,
    marginTop: 3,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});
