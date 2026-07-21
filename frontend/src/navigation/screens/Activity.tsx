import { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Alert,
} from "react-native";
import { Text } from "../../components/Text";
import { useTheme, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import {
  notificationService,
  NotificationDTO,
} from "../../api/notificationService";
import {
  acceptFollowRequest,
  declineFollowRequest,
} from "../../api/followService";
import { parseServerDate } from "../../utils/date";
import { Avatar } from "../../components/Avatar";
import { PresignedImage } from "../../components/PresignedImage";
import { useTrackTab } from "../../hooks/useTrackTab";
import { useSwipeableDelete } from "../../hooks/useSwipeableDelete";
import { Spinner } from "../../components/Spinner";

const THUMBNAIL_SIZE = 48;
const DAY_MS = 24 * 60 * 60 * 1000;

type Section = {
  title: string;
  data: NotificationDTO[];
};

/**
 * Bucket notifications into Today / Last 7 Days / Last 30 Days.
 * Anything older than 30 days is dropped and never rendered.
 *
 * TODO: notifications older than 30 days are only filtered client-side here.
 * Add a backend cleanup (scheduled purge or query-time filter) so stale rows
 * are actually removed from the notification table.
 */
function groupNotifications(items: NotificationDTO[]): Section[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const last7Cutoff = startOfToday - 7 * DAY_MS;
  const last30Cutoff = startOfToday - 30 * DAY_MS;

  const today: NotificationDTO[] = [];
  const last7: NotificationDTO[] = [];
  const last30: NotificationDTO[] = [];

  for (const item of items) {
    const t = parseServerDate(item.createdAt).getTime();
    if (t >= startOfToday) {
      today.push(item);
    } else if (t >= last7Cutoff) {
      last7.push(item);
    } else if (t >= last30Cutoff) {
      last30.push(item);
    }
    // older than 30 days → intentionally skipped
  }

  return [
    { title: "Today", data: today },
    { title: "Last 7 Days", data: last7 },
    { title: "Last 30 Days", data: last30 },
  ].filter((section) => section.data.length > 0);
}

function formatTimestamp(dateString: string): string {
  const date = parseServerDate(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(seconds / 86400);

  if (seconds < 60) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function renderAction(item: NotificationDTO): string {
  switch (item.type) {
    case "FOLLOW":
      return " followed you";
    case "FOLLOW_REQUEST":
      return " wants to follow you";
    case "LIKE":
      return " liked your post";
    case "COMMENT":
      return item.commentBody
        ? ` commented: ${item.commentBody}`
        : " commented on your post";
    case "REPLY":
      return item.commentBody
        ? ` replied: ${item.commentBody}`
        : " replied to your comment";
    case "MENTION":
      return item.commentBody
        ? ` mentioned you: ${item.commentBody}`
        : " mentioned you";
    default:
      return " interacted";
  }
}

export function Activity() {
  useTrackTab("Activity");

  const { colors } = useTheme();
  // RN's static navigation config leaves the global param list unwired, so the
  // typed hook resolves to `never` repo-wide; cast to use navigate/goBack.
  const navigation = useNavigation() as any;

  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  // Forces relative timestamps ("5m", "2h") to re-render while the screen stays
  // open, so they don't go stale until the next navigation.
  const [, forceUpdate] = useState(0);

  // Sections are derived from the flat list so deletions recompute grouping
  // (and drop now-empty section headers) without a refetch.
  const sections = useMemo(
    () => groupNotifications(notifications),
    [notifications],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await notificationService.getNotifications();
        if (!active) return;
        setNotifications(data);
        await notificationService.markNotificationsRead();
      } catch (error) {
        console.error("Failed to load notifications", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Optimistically remove the row, then call the backend. Restore on failure so
  // the UI never drifts out of sync with the stored notifications.
  const handleDelete = async (id: string) => {
    let snapshot: NotificationDTO[] = [];
    setNotifications((list) => {
      snapshot = list;
      return list.filter((n) => n.notificationId !== id);
    });

    try {
      await notificationService.deleteNotification(id);
    } catch (error) {
      console.error("Failed to delete notification", error);
      setNotifications(snapshot);
      Alert.alert("Error", "Couldn't delete this activity. Please try again.");
    }
  };

  // Accepting a follow request turns the row into a regular follow notification
  // in place, re-stamped to now so it reads "now" instead of the request time.
  // The backend re-creates it with a fresh timestamp too, so a reload matches.
  const handleAccept = async (item: NotificationDTO) => {
    if (!item.actorUserId) return;
    try {
      await acceptFollowRequest(item.actorUserId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === item.notificationId
            ? { ...n, type: "FOLLOW", createdAt: new Date().toISOString() }
            : n,
        ),
      );
    } catch (error) {
      console.error("Failed to accept follow request", error);
    }
  };

  const handleDecline = async (item: NotificationDTO) => {
    if (!item.actorUserId) return;
    try {
      await declineFollowRequest(item.actorUserId);
      setNotifications((prev) =>
        prev.filter((n) => n.notificationId !== item.notificationId),
      );
    } catch (error) {
      console.error("Failed to decline follow request", error);
    }
  };

  const { getSwipeableProps } = useSwipeableDelete({
    onDelete: handleDelete,
    deleteTitle: "Delete Activity",
    deleteMessage: "Are you sure you want to remove this activity?",
  });

  const mutedColor = (colors.text as string) + "99";

  const renderRowBody = (item: NotificationDTO) => {
    const isFollowRequest = item.type === "FOLLOW_REQUEST";
    const hasThumbnail =
      (item.type === "LIKE" ||
        item.type === "COMMENT" ||
        item.type === "REPLY" ||
        item.type === "MENTION") &&
      !!item.postImageUrl;

    const handlePress = () => {
      if (isFollowRequest) return;
      if (item.type === "FOLLOW") {
        navigation.push("UserProfile", { username: item.actorUsername });
      } else if (item.type === "COMMENT" && item.postId) {
        navigation.navigate("PostDetail", {
          postId: item.postId,
          openCommentsOnMount: true,
        });
      } else if (
        (item.type === "REPLY" || item.type === "MENTION") &&
        item.postId
      ) {
        navigation.navigate("PostDetail", {
          postId: item.postId,
          // A caption mention has no comment thread (no commentBody/focus id).
          openCommentsOnMount: !!item.focusCommentId,
          focusCommentId: item.focusCommentId ?? undefined,
        });
      } else if (item.type === "LIKE" && item.postId) {
        navigation.navigate("PostDetail", { postId: item.postId });
      }
    };

    return (
      <TouchableOpacity
        activeOpacity={isFollowRequest ? 1 : 0.7}
        onPress={handlePress}
        style={[styles.row, { backgroundColor: colors.background }]}
      >
        <TouchableOpacity
          onPress={() =>
            navigation.push("UserProfile", {
              username: item.actorUsername,
            })
          }
          style={styles.avatarWrapper}
        >
          <Avatar
            username={item.actorUsername}
            profilePictureUrl={item.actorProfilePictureUrl}
            size={44}
          />
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text
            style={[styles.description, { color: colors.text }]}
            numberOfLines={2}
          >
            <Text style={styles.username}>{item.actorUsername}</Text>
            {renderAction(item)}
            <Text style={[styles.timestamp, { color: mutedColor }]}>
              {"  ·  "}
              {formatTimestamp(item.createdAt)}
            </Text>
          </Text>

          {isFollowRequest && (
            <View style={styles.requestButtons}>
              <TouchableOpacity
                style={[
                  styles.requestBtn,
                  styles.acceptBtn,
                  { backgroundColor: colors.text, borderColor: colors.border },
                ]}
                onPress={() => handleAccept(item)}
              >
                <Text
                  style={[styles.acceptBtnText, { color: colors.background }]}
                >
                  Accept
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.requestBtn, styles.declineBtn]}
                onPress={() => handleDecline(item)}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {hasThumbnail ? (
          <PresignedImage
            imageKey={item.postImageUrl}
            style={[styles.thumbnail, { backgroundColor: colors.border }]}
          />
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderRow = ({ item }: { item: NotificationDTO }) => {
    // Follow requests are actioned via Accept/Decline, not swipe-to-delete, so
    // they skip the Swipeable wrapper.
    if (item.type === "FOLLOW_REQUEST") {
      return renderRowBody(item);
    }

    return (
      <Swipeable {...getSwipeableProps(item.notificationId)}>
        {/* Opaque background so the red delete action stays hidden until swiped */}
        {renderRowBody(item)}
      </Swipeable>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Activity</Text>

        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <Spinner size="large" color={colors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="notifications-outline"
            size={48}
            color={colors.border}
          />
          <Text style={[styles.emptyText, { color: mutedColor }]}>
            No activity yet
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.notificationId}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.text, backgroundColor: colors.background },
              ]}
            >
              {section.title}
            </Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backButton: {
    width: 32,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  username: {
    fontWeight: "700",
  },
  timestamp: {
    fontSize: 13,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
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
  requestButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  requestBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptBtn: {
    borderWidth: 1,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  declineBtn: {
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  declineBtnText: {
    color: "#ff3b30",
    fontSize: 13,
    fontWeight: "600",
  },
});
