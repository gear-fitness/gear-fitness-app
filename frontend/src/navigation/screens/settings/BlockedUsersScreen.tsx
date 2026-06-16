import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  getBlockedUsers,
  unblockUser,
  FollowActivityDTO,
} from "../../../api/followService";
import { Avatar } from "../../../components/Avatar";

export function BlockedUsersScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [blocked, setBlocked] = useState<FollowActivityDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getBlockedUsers();
      setBlocked(data);
    } catch {
      Alert.alert("Error", "Failed to load blocked users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = (user: FollowActivityDTO) => {
    Alert.alert(
      `Unblock @${user.username}?`,
      "They will be able to follow you and see your public posts again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            setBlocked((prev) => prev.filter((u) => u.userId !== user.userId));
            try {
              await unblockUser(user.userId);
            } catch {
              setBlocked((prev) => [...prev, user]);
              Alert.alert("Error", "Failed to unblock this user.");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Blocked Users
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : blocked.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="ban-outline" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.text + "80" }]}>
            No blocked users
          </Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Avatar
                username={item.username}
                profilePictureUrl={item.profilePictureUrl}
                size={44}
              />
              <View style={styles.nameBlock}>
                <Text style={[styles.username, { color: colors.text }]}>
                  @{item.username}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.unblockBtn, { borderColor: colors.border }]}
                onPress={() => handleUnblock(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.unblockText, { color: colors.text }]}>
                  Unblock
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 32,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  nameBlock: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  unblockText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
