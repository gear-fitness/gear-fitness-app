import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useTheme } from "@react-navigation/native";
import { FeedPost, socialFeedApi } from "../api/socialFeedApi";
import { parseLocalDate } from "../utils/date";
import { useAuth } from "../context/AuthContext";
interface Props {
  post: FeedPost;
  onOpenComments: (postId: string) => void;
}

export function FeedPostCard({ post, onOpenComments }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likedByUser, setLikedByUser] = useState(post.likedByCurrentUser);
  const [liking, setLiking] = useState(false);
  const navigation = useNavigation<any>();

  const isOwnPost = post.username === user?.username;

  const handleLike = async () => {
    if (liking) return;

    // Optimistic update
    const wasLiked = likedByUser;
    setLikedByUser(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      setLiking(true);
      await socialFeedApi.toggleLike(post.postId);
    } catch (error) {
      // Revert on error
      setLikedByUser(wasLiked);
      setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      console.error("Error toggling like:", error);
    } finally {
      setLiking(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  const formatDate = (dateString: string) => {
    return parseLocalDate(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatBodyTag = (tag: string) => {
    return tag
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* User Header */}
      <View style={styles.header}>
        {isOwnPost ? (
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {post.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.username, { color: colors.text }]}>
                {post.username}
              </Text>
              <Text
                style={[styles.timestamp, { color: colors.text, opacity: 0.6 }]}
              >
                {formatTimeAgo(post.createdAt)}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("UserProfile", {
                username: post.username,
              })
            }
          >
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {post.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.username, { color: colors.text }]}>
                  {post.username}
                </Text>
                <Text
                  style={[styles.timestamp, { color: colors.text, opacity: 0.6 }]}
                >
                  {formatTimeAgo(post.createdAt)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Workout Info */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          const targetNavigator = navigation.getParent() || navigation;
          targetNavigator.navigate("DetailedHistory", {
            workoutId: post.workoutId,
            caption: post.caption,
            workoutName: post.workoutName,
          });
        }}
      >
        <View style={styles.workoutInfo}>
          <Text style={[styles.workoutName, { color: colors.text }]}>
            {post.workoutName}
          </Text>
          <View style={styles.workoutMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.text} />
              <Text
                style={[styles.metaText, { color: colors.text, opacity: 0.6 }]}
              >
                {formatDate(post.datePerformed)}
              </Text>
            </View>
            {post.durationMin && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.text} />
                <Text
                  style={[styles.metaText, { color: colors.text, opacity: 0.6 }]}
                >
                  {post.durationMin} min
                </Text>
              </View>
            )}
            {post.bodyTags?.length > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="fitness-outline" size={16} color={colors.text} />
                <Text
                  style={[styles.metaText, { color: colors.text, opacity: 0.6 }]}
                >
                  {post.bodyTags.map(formatBodyTag).join(", ")}
                </Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="list-outline" size={16} color={colors.text} />
                <Text
                  style={[styles.metaText, { color: colors.text, opacity: 0.6 }]}
                >
                  {post.exerciseCount} {post.exerciseCount === 1 ? 'exercise' : 'exercises'}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="stats-chart-outline" size={16} color={colors.text} />
                <Text
                  style={[styles.metaText, { color: colors.text, opacity: 0.6 }]}
                >
                  {post.setCount} {post.setCount === 1 ? 'set' : 'sets'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Caption */}
        {post.caption && (
          <Text style={[styles.caption, { color: colors.text }]}>
            {post.caption}
          </Text>
        )}
      </TouchableOpacity>

      {/* Engagement */}
      <View style={[styles.engagement, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.engagementItem}
          onPress={handleLike}
          disabled={liking}
        >
          <Ionicons
            name={likedByUser ? "heart" : "heart-outline"}
            size={24}
            color={likedByUser ? "#e74c3c" : colors.text}
          />
          <Text
            style={[
              styles.engagementText,
              { color: likedByUser ? "#e74c3c" : colors.text },
            ]}
          >
            {likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.engagementItem}
          onPress={() =>
            navigation.navigate("Comments", { postId: post.postId })
          }
        >
          <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
          <Text style={[styles.engagementText, { color: colors.text }]}>
            {post.commentCount}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 0,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  workoutInfo: {
    padding: 16,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  workoutMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  metaText: {
    fontSize: 14,
  },
  caption: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 15,
    lineHeight: 20,
  },
  engagement: {
    flexDirection: "row",
    gap: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  engagementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  engagementText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
