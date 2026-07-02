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

/** Where a category's ⋯ dropdown should sit — measured from its trigger button
 *  (screen coords: distance from the top and from the right edge). */
export interface CategoryMenuAnchor {
  name: string;
  top: number;
  right: number;
}

/**
 * A lightweight dropdown for a meal-category's ⋯ button. Anchored just under the
 * button (not a bottom sheet), with left-aligned option labels and a right-side
 * checkmark for the active "Make recurring" state — a layout the native iOS
 * menu doesn't let us control.
 */
export function CategoryDropdown({
  anchor,
  recurring,
  onClose,
  onToggleRecurring,
  onRename,
  onDelete,
}: {
  anchor: CategoryMenuAnchor | null;
  recurring: boolean;
  onClose: () => void;
  onToggleRecurring: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const t = useThemeColors();

  return (
    <Modal
      visible={!!anchor}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop catches outside taps; the menu sits above it. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      {anchor && (
        <View
          style={[
            styles.menu,
            {
              top: anchor.top,
              right: anchor.right,
              backgroundColor: t.cardBg,
              borderColor: t.cardBorder,
            },
          ]}
        >
          <Row
            label="Make recurring"
            checked={recurring}
            onPress={onToggleRecurring}
            t={t}
          />
          <Row label="Rename" onPress={onRename} t={t} />
          <Row label="Delete" destructive last onPress={onDelete} t={t} />
        </View>
      )}
    </Modal>
  );
}

function Row({
  label,
  checked,
  destructive,
  last,
  onPress,
  t,
}: {
  label: string;
  checked?: boolean;
  destructive?: boolean;
  last?: boolean;
  onPress: () => void;
  t: ReturnType<typeof useThemeColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.row,
        !last && {
          borderBottomColor: t.separator,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[styles.label, { color: destructive ? t.danger : t.text }]}
      >
        {label}
      </Text>
      {checked ? (
        <Ionicons name="checkmark" size={18} color={t.tint} />
      ) : (
        <View style={styles.checkSpacer} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    minWidth: 210,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: { flex: 1, textAlign: "left", fontSize: 16, fontWeight: "500" },
  checkSpacer: { width: 18 },
});
