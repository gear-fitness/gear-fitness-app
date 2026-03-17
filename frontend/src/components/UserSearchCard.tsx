import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Avatar } from "./Avatar";

type Props = {
  username: string;
  profilePictureUrl?: string | null;
  onPress: () => void;
};

export function UserSearchCard({ username, profilePictureUrl, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Avatar
        username={username}
        profilePictureUrl={profilePictureUrl}
        size={42}
        style={styles.avatar}
      />

      <View>
        <Text style={[styles.username, { color: colors.text }]}>
          {username}
        </Text>
        <Text style={[styles.subtext, { color: colors.border }]}>
          View profile
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    elevation: 2,
  },
  avatar: {
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtext: {
    fontSize: 12,
    marginTop: 2,
  },
});
