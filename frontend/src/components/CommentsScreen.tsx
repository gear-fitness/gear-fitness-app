import { useState, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useRoute } from "@react-navigation/native";
import { socialFeedApi, Comment } from "../api/socialFeedApi";

export function CommentsScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const postId = route.params?.postId;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    if (postId) {
      loadComments();
    }
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await socialFeedApi.getComments(postId, 0, 100);
      setComments(response.content);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || commenting) return;

    try {
      setCommenting(true);
      const newComment = await socialFeedApi.addComment(
        postId,
        commentText.trim()
      );
      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setCommenting(false);
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

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.username, { color: colors.text }]}>
            {item.username}
          </Text>
          <Text
            style={[styles.timestamp, { color: colors.text, opacity: 0.6 }]}
          >
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
        <Text style={[styles.commentBody, { color: colors.text }]}>
          {item.body}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={48} color={colors.border} />
      <Text style={[styles.emptyText, { color: colors.border }]}>
        No comments yet
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.border }]}>
        Be the first to comment!
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            style={{ flex: 1, paddingHorizontal: 10 }}
            contentContainerStyle={styles.commentsList}
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.commentId}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Row - Matches ExerciseChat */}
        <View
          style={[
            styles.inputRow,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text },
            ]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.border}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            blurOnSubmit={true}
          />
          <TouchableOpacity
            onPress={handleAddComment}
            disabled={!commentText.trim() || commenting}
            style={[
              styles.sendButton,
              { opacity: commentText.trim() && !commenting ? 1 : 0.5 },
            ]}
          >
            {commenting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.sendArrow}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  commentsList: {
    paddingVertical: 10,
  },
  commentItem: {
    flexDirection: "row",
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
  },
  commentBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    borderWidth: 1,
    borderRadius: 25,
    marginHorizontal: 10,
    marginBottom: 25,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  sendArrow: {
    color: "#000",
    fontSize: 20,
    fontWeight: "bold",
  },
});
