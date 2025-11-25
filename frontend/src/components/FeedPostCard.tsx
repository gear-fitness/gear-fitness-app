import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { FeedPost } from "../api/socialFeedApi";
interface Props {
  post: FeedPost;
}

export function FeedPostCard({ post }: Props) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
    <View style={styles.card}>
      {/* User Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {post.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.username}>{post.username}</Text>
            <Text style={styles.timestamp}>{formatDate(post.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Workout Info */}
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutName}>{post.workoutName}</Text>
        <View style={styles.workoutMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="barbell-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{formatBodyTag(post.bodyTag)}</Text>
          </View>
          {post.durationMin && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.metaText}>{post.durationMin} min</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.metaText}>
              {formatDate(post.datePerformed)}
            </Text>
          </View>
        </View>
      </View>

      {/* Caption */}
      {post.caption && <Text style={styles.caption}>{post.caption}</Text>}

      {/* Engagement */}
      <View style={styles.engagement}>
        <TouchableOpacity style={styles.engagementItem}>
          <Ionicons
            name={post.likedByCurrentUser ? "heart" : "heart-outline"}
            size={24}
            color={post.likedByCurrentUser ? "#e74c3c" : "#666"}
          />
          <Text style={styles.engagementText}>{post.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.engagementItem}>
          <Ionicons name="chatbubble-outline" size={24} color="#666" />
          <Text style={styles.engagementText}>{post.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
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
    backgroundColor: "#007AFF",
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
    color: "#666",
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
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: "#666",
  },
  caption: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
    lineHeight: 20,
  },
  engagement: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  engagementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  engagementText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
});
