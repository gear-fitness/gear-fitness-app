import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { BottomSheet } from "./BottomSheet";

// Fixed square tile sized to the 3-up layout so the 2-action (own post) menu
// uses the same tile size as the 3-action (others' post) menu instead of
// stretching to fill the row. 32 = row padding (16 x2), 24 = two 12px gaps.
const TILE_SIZE = (Dimensions.get("window").width - 32 - 24) / 3;

export interface PostAction {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  actions: PostAction[];
  onClose: () => void;
  onClosed?: () => void;
}

const DESTRUCTIVE_COLOR = "#e74c3c";

export function PostActionsSheet({
  visible,
  actions,
  onClose,
  onClosed,
}: Props) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={onClosed}>
      <View style={styles.row}>
        {actions.map((action) => {
          const tint = action.destructive ? DESTRUCTIVE_COLOR : colors.text;
          return (
            <TouchableOpacity
              key={action.key}
              activeOpacity={0.7}
              onPress={action.onPress}
              style={[
                styles.tile,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name={action.icon} size={32} color={tint} />
              <Text style={[styles.tileLabel, { color: tint }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  tile: {
    width: TILE_SIZE,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
