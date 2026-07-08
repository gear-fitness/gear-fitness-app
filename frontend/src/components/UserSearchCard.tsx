import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@react-navigation/native";
import { Avatar } from "./Avatar";

type Props = {
  username: string;
  displayName?: string | null;
  profilePictureUrl?: string | null;
  followsCurrentUser?: boolean;
  onPress: () => void;
};

function buildSubtext(
  displayName: string | null | undefined,
  followsCurrentUser: boolean | undefined,
): string | null {
  const name = displayName?.trim() ?? "";
  if (name && followsCurrentUser) return `${name} · Follows you`;
  if (name) return name;
  if (followsCurrentUser) return "Follows you";
  return null;
}

export function UserSearchCard({
  username,
  displayName,
  profilePictureUrl,
  followsCurrentUser,
  onPress,
}: Props) {
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
        {(() => {
          const subtext = buildSubtext(displayName, followsCurrentUser);
          return subtext ? (
            <Text style={[styles.subtext, { color: colors.border }]}>
              {subtext}
            </Text>
          ) : null;
        })()}
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
