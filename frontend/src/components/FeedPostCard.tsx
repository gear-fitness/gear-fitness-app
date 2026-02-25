import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useTheme } from "@react-navigation/native";
import { FeedPost, socialFeedApi } from "../api/socialFeedApi";
import { parseLocalDate } from "../utils/date";
import { useAuth } from "../context/AuthContext";

// Body tag → accent color mapping
const BODY_TAG_COLORS: Record<string, string> = {
  CHEST: "#FF6B6B",
  BACK: "#4ECDC4",
  LEGS: "#45B7D1",
  SHOULDERS: "#96CEB4",
  ARMS: "#F7B731",
  CORE: "#A55EEA",
  FULL_BODY: "#007AFF",
};
const getTagColor = (tag: string): string =>
  BODY_TAG_COLORS[tag.toUpperCase()] ?? "#007AFF";

interface Props {
  post: FeedPost;
}

export function FeedPostCard({ post }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likedByUser, setLikedByUser] = useState(post.likedByCurrentUser);
  const [liking, setLiking] = useState(false);
  const navigation = useNavigation<any>();

  const isOwnPost = post.username === user?.username;
  const primaryTagColor =
    post.bodyTags?.length > 0 ? getTagColor(post.bodyTags[0]) : "#007AFF";

  const handleLike = async () => {
    if (liking) return;
    const wasLiked = likedByUser;
    setLikedByUser(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));
    try {
      setLiking(true);
      await socialFeedApi.toggleLike(post.postId);
    } catch (error) {
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

  const formatDate = (dateString: string) =>
    parseLocalDate(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatBodyTag = (tag: string) =>
    tag
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Colored top accent bar based on primary body tag */}
      <View
        style={[styles.accentBar, { backgroundColor: primaryTagColor }]}
      />

      {/* User Header */}
      <View style={styles.header}>
        {isOwnPost ? (
          <View style={styles.userInfo}>
            <View
              style={[styles.avatar, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.avatarText}>
                {post.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.username, { color: colors.text }]}>
                {post.username}
              </Text>
              <Text style={[styles.timestamp, { color: colors.text, opacity: 0.5 }]}>
                {formatTimeAgo(post.createdAt)}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("UserProfile", { username: post.username })
            }
          >
            <View style={styles.userInfo}>
              <View
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.avatarText}>
                  {post.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.username, { color: colors.text }]}>
                  {post.username}
                </Text>
                <Text style={[styles.timestamp, { color: colors.text, opacity: 0.5 }]}>
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
          {/* Workout name */}
          <Text style={[styles.workoutName, { color: colors.text }]}>
            {post.workoutName}
          </Text>

          {/* Date row */}
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.text}
              style={{ opacity: 0.5 }}
            />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDate(post.datePerformed)}
            </Text>
          </View>

          {/* Body tag pill badges */}
          {post.bodyTags?.length > 0 && (
            <View style={styles.tagsRow}>
              {post.bodyTags.slice(0, 3).map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.tagPill,
                    { backgroundColor: getTagColor(tag) + "22" },
                  ]}
                >
                  <Text
                    style={[styles.tagText, { color: getTagColor(tag) }]}
                  >
                    {formatBodyTag(tag)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Stat chips: duration, exercises, sets */}
          <View style={styles.statChipsRow}>
            {post.durationMin != null && (
              <View
                style={[
                  styles.statChip,
                  { backgroundColor: colors.border + "40" },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={colors.text}
                  style={{ opacity: 0.65 }}
                />
                <Text style={[styles.statChipText, { color: colors.text }]}>
                  {post.durationMin}m
                </Text>
              </View>
            )}
            <View
              style={[
                styles.statChip,
                { backgroundColor: colors.border + "40" },
              ]}
            >
              <Ionicons
                name="list-outline"
                size={13}
                color={colors.text}
                style={{ opacity: 0.65 }}
              />
              <Text style={[styles.statChipText, { color: colors.text }]}>
                {post.exerciseCount}{" "}
                {post.exerciseCount === 1 ? "exercise" : "exercises"}
              </Text>
            </View>
            <View
              style={[
                styles.statChip,
                { backgroundColor: colors.border + "40" },
              ]}
            >
              <Ionicons
                name="stats-chart-outline"
                size={13}
                color={colors.text}
                style={{ opacity: 0.65 }}
              />
              <Text style={[styles.statChipText, { color: colors.text }]}>
                {post.setCount} {post.setCount === 1 ? "set" : "sets"}
              </Text>
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
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar: {
    height: 3,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 4,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
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
    paddingTop: 12,
  },
  workoutName: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 13,
    opacity: 0.55,
    fontWeight: "500",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tagPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.8,
  },
  caption: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    fontSize: 15,
    lineHeight: 21,
    fontStyle: "italic",
    opacity: 0.8,
  },
  engagement: {
    flexDirection: "row",
    gap: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
