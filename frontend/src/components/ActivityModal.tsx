import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useTheme, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { getFollowActivity } from "../api/followService";

type ActivityModalProps = {
  visible: boolean;
  onClose: () => void;
};

type ActivityItem = {
  userId: string;
  username: string;
  createdAt: string;
};

export function ActivityModal({ visible, onClose }: ActivityModalProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const loadActivity = async () => {
      try {
        setLoading(true);
        const data = await getFollowActivity();

        const normalized: ActivityItem[] = data.map((item: any) => ({
          userId: item.userId,
          username: item.username,
          createdAt: item.createdAt ?? new Date().toISOString(),
        }));

        setActivity(normalized);
      } catch (error) {
        console.error("Failed to load activity", error);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [visible]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const renderItem = ({ item }: { item: ActivityItem }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        onClose();
        navigation.navigate("UserProfile", {
          username: item.username,
        });
      }}
      style={[styles.activityRow, { borderBottomColor: colors.border }]}
    >
      <Ionicons
        name="person-circle-outline"
        size={42}
        color={colors.primary}
        style={styles.avatar}
      />

      <View style={styles.textContainer}>
        <View style={styles.rowText}>
          <Text style={[styles.activityText, { color: colors.text }]}>
            <Text style={styles.username}>{item.username}</Text> followed you
          </Text>

          <Text style={[styles.time, { color: colors.text + "99" }]}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Activity</Text>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activity.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="notifications-outline"
              size={48}
              color={colors.border}
            />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No activity yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={activity}
            keyExtractor={(item) => item.userId}
            renderItem={renderItem}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
  },

  title: { fontSize: 18, fontWeight: "600" },

  closeButton: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  emptyText: { marginTop: 12, fontSize: 16 },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },

  avatar: { marginRight: 12 },

  textContainer: { flex: 1 },

  rowText: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  activityText: { fontSize: 16 },

  username: { fontWeight: "600" },

  time: { fontSize: 12 },
});
