import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { FeedPost } from "../api/socialFeedApi";
interface Props {
  post: FeedPost;
}

export function FeedPostCard({ post }: Props) {
  const { colors } = useTheme();
  const formatDate = (dateString: string) => {
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
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
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {post.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.username, { color: colors.text }]}>{post.username}</Text>
            <Text style={[styles.timestamp, { color: colors.text, opacity: 0.6 }]}>{formatDate(post.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Workout Info */}
      <View style={styles.workoutInfo}>
        <Text style={[styles.workoutName, { color: colors.text }]}>{post.workoutName}</Text>
        <View style={styles.workoutMeta}>
          {post.bodyTags && post.bodyTags.length > 0 && (
            <View style={styles.bodyTagsContainer}>
              {post.bodyTags.map((tag, index) => (
                <View
                  key={index}
                  style={[
                    styles.bodyTagChip,
                    { backgroundColor: colors.primary, opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.bodyTagText}>{formatBodyTag(tag)}</Text>
                </View>
              ))}
            </View>
          )}
          {post.durationMin && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.text} />
              <Text style={[styles.metaText, { color: colors.text, opacity: 0.7 }]}>{post.durationMin} min</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color={colors.text} />
            <Text style={[styles.metaText, { color: colors.text, opacity: 0.7 }]}>
              {formatDate(post.datePerformed)}
            </Text>
          </View>
        </View>
      </View>

      {/* Caption */}
      {post.caption && <Text style={[styles.caption, { color: colors.text }]}>{post.caption}</Text>}

      {/* Engagement */}
      <View style={[styles.engagement, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.engagementItem}>
          <Ionicons
            name={post.likedByCurrentUser ? "heart" : "heart-outline"}
            size={24}
            color={post.likedByCurrentUser ? "#e74c3c" : colors.text}
          />
          <Text style={[styles.engagementText, { color: colors.text }]}>{post.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.engagementItem}>
          <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
          <Text style={[styles.engagementText, { color: colors.text }]}>{post.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
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
    marginBottom: 12,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  workoutMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  bodyTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bodyTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bodyTagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 14,
  },
  caption: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  engagement: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  engagementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  engagementText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
