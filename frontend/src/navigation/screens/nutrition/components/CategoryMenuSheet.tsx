import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../../../hooks/useThemeColors";

/**
 * Action menu for a meal category (the three-dot header button). "Make
 * recurring" is a toggle reflecting whether the category repeats on future
 * days; "Rename" and "Delete" hand back to the screen.
 */
export function CategoryMenuSheet({
  categoryName,
  recurring,
  visible,
  onClose,
  onToggleRecurring,
  onRename,
  onDelete,
}: {
  categoryName: string | null;
  recurring: boolean;
  visible: boolean;
  onClose: () => void;
  onToggleRecurring: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const t = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: t.cardBg, borderColor: t.cardBorder },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: t.handle }]} />
          {categoryName ? (
            <Text style={[styles.title, { color: t.secondary }]}>
              {categoryName}
            </Text>
          ) : null}

          <MenuRow
            icon="repeat"
            label="Make recurring"
            t={t}
            active={recurring}
            onPress={onToggleRecurring}
          />
          <MenuRow icon="pencil" label="Rename" t={t} onPress={onRename} />
          <MenuRow
            icon="trash-outline"
            label="Delete"
            t={t}
            destructive
            onPress={onDelete}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuRow({
  icon,
  label,
  t,
  active,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  t: ReturnType<typeof useThemeColors>;
  active?: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  const color = destructive ? t.danger : t.text;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      {active !== undefined && (
        <View style={styles.rowRight}>
          {active ? (
            <Ionicons name="checkmark" size={20} color={t.tint} />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 15,
  },
  rowLabel: { fontSize: 17, flex: 1 },
  rowRight: { width: 24, alignItems: "flex-end" },
});
