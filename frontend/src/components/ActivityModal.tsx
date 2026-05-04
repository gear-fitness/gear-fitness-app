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

import { notificationService } from "../api/notificationService";
import { parseServerDate } from "../utils/date";
import { Avatar } from "./Avatar";

type ActivityModalProps = {
  visible: boolean;
  onClose: () => void;
};

type NotificationItem = {
  notificationId: string;
  type: string;
  actorUsername: string;
  actorProfilePictureUrl?: string | null;
  postId?: string;
  workoutId?: string | null;
  commentBody?: string;
  createdAt: string;
  isRead: boolean;
};

export function ActivityModal({ visible, onClose }: ActivityModalProps) {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!visible) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const data = await notificationService.getNotifications();
        setNotifications(data);
        await notificationService.markNotificationsRead();
      } catch (error) {
        console.error("Failed to load notifications", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [visible]);

  const formatTimeAgo = (dateString: string) => {
    const date = parseServerDate(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(seconds / 86400);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const actionText = (() => {
      switch (item.type) {
        case "FOLLOW":
          return " followed you";
        case "LIKE":
          return " liked your post";
        case "COMMENT":
          return " commented on your post";
        default:
          return " interacted";
      }
    })();

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          onClose();

          if (item.type === "FOLLOW") {
            navigation.navigate("UserProfile", {
              username: item.actorUsername,
            });
          } else if (item.type === "COMMENT" && item.postId) {
            navigation.navigate("PostDetail", {
              postId: item.postId,
              openCommentsOnMount: true,
            });
          } else if (item.type === "LIKE" && item.postId) {
            navigation.navigate("PostDetail", {
              postId: item.postId,
            });
          }
        }}
        style={[styles.row, { borderBottomColor: colors.border }]}
      >
        {/* Avatar — tapping navigates to the actor's profile */}
        <TouchableOpacity
          onPress={() => {
            onClose();
            navigation.navigate("UserProfile", {
              username: item.actorUsername,
            });
          }}
          style={styles.avatarWrapper}
        >
          <Avatar
            username={item.actorUsername}
            profilePictureUrl={item.actorProfilePictureUrl}
            size={40}
          />
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={{ color: colors.text }}>
            <Text style={{ fontWeight: "600" }}>{item.actorUsername}</Text>
            {actionText}
          </Text>
          {item.type === "COMMENT" && item.commentBody ? (
            <Text
              style={[styles.commentPreview, { color: colors.text + "99" }]}
              numberOfLines={1}
            >
              "{item.commentBody}"
            </Text>
          ) : null}
        </View>

        <Text style={[styles.time, { color: colors.text + "99" }]}>
          {formatTimeAgo(item.createdAt)}
        </Text>
      </TouchableOpacity>
    );
  };

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
          <View style={{ width: 24 }} />

          <Text style={[styles.title, { color: colors.text }]}>Activity</Text>

          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="notifications-outline"
              size={48}
              color={colors.border}
            />
            <Text style={[styles.emptyText, { color: colors.text + "99" }]}>
              No activity yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.notificationId}
            renderItem={renderItem}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  commentPreview: {
    fontSize: 13,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
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
});
