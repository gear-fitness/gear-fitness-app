import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

type Props = {
  username: string;
  onPress: () => void;
};

export function UserSearchCard({ username, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarLetter}>
          {username.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.textBlock}>
        <Text style={[styles.username, { color: colors.text }]}>
          {username}
        </Text>
        <Text style={[styles.subtext, { color: colors.text }]}>
          View profile
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.border} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarLetter: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  textBlock: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtext: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.5,
  },
});
