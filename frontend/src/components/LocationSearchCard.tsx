import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

type Props = {
  name: string;
  address?: string | null;
  postCount: number;
  onPress: () => void;
};

/**
 * One gym in the Social tab's search results. Mirrors UserSearchCard's
 * layout, with a pin badge standing in for the avatar.
 */
export function LocationSearchCard({
  name,
  address,
  postCount,
  onPress,
}: Props) {
  const { colors } = useTheme();

  const subtextParts = [
    address ?? null,
    `${postCount} ${postCount === 1 ? "post" : "posts"}`,
  ].filter(Boolean);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.badge, { borderColor: colors.border }]}>
        <Ionicons name="location-outline" size={20} color={colors.text} />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text
          style={[styles.subtext, { color: colors.border }]}
          numberOfLines={1}
        >
          {subtextParts.join(" · ")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  subtext: {
    fontSize: 13,
    marginTop: 1,
  },
});
