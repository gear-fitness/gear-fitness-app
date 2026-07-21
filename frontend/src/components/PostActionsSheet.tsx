import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { BottomSheet } from "./BottomSheet";

const TILE_GAP = 12;
// Fixed square tile sized to the 3-up layout so every menu uses the same tile
// size regardless of action count: 2-3 actions center in the row, 4+ overflow
// into a horizontal scroll with the next tile peeking at the screen edge.
// 32 = row padding (16 x2), 24 = two 12px gaps.
const TILE_SIZE = (Dimensions.get("window").width - 32 - TILE_GAP * 2) / 3;

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
    // bodyDrag off now that the row scrolls, per BottomSheet's guidance: the
    // body pan responder must never compete with a ScrollView for touches.
    // Dismissal stays on the grabber and backdrop.
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      bodyDrag={false}
    >
      <ScrollView
        horizontal
        style={styles.scroller}
        contentContainerStyle={styles.row}
        showsHorizontalScrollIndicator={false}
        // Snap to whole tiles: each extra tile overflows by exactly
        // TILE_SIZE + TILE_GAP (the row padding cancels out), so interval
        // snapping settles flush at both ends with no half-cut tile at rest.
        snapToInterval={TILE_SIZE + TILE_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
      >
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
              <Text
                style={[styles.tileLabel, { color: tint }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Hug the tile row's height instead of flexing into the sheet.
  scroller: {
    flexGrow: 0,
  },
  // flexGrow lets a not-full row (2-3 actions) fill the viewport width so
  // justifyContent can center it; a full row scrolls normally.
  row: {
    flexGrow: 1,
    flexDirection: "row",
    gap: TILE_GAP,
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
