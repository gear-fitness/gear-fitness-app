import { useState, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  Text,
  Keyboard,
  KeyboardEvent,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useRoute, useNavigation } from "@react-navigation/native";
import { socialFeedApi, Comment } from "../api/socialFeedApi";
import { parseServerDate } from "../utils/date";
import { Avatar } from "./Avatar";

export function CommentsScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const postId = route.params?.postId;
  const insets = useSafeAreaInsets();

  const goToProfile = (username: string) => {
    navigation.goBack();
    setTimeout(() => {
      navigation.navigate("UserProfile", { username });
    }, 200);
  };

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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
        commentText.trim(),
      );
      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setCommenting(false);
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "Just now";
    const date = parseServerDate(dateString);
    if (isNaN(date.getTime())) return "Just now";
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

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <TouchableOpacity
        onPress={() => goToProfile(item.username)}
        activeOpacity={0.7}
      >
        <Avatar
          username={item.username}
          profilePictureUrl={item.userProfilePictureUrl}
          size={36}
        />
      </TouchableOpacity>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <TouchableOpacity
            onPress={() => goToProfile(item.username)}
            activeOpacity={0.7}
          >
            <Text style={[styles.username, { color: colors.text }]}>
              {item.username}
            </Text>
          </TouchableOpacity>
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
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
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View
        style={[
          styles.inputRow,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
            marginBottom:
              keyboardHeight > 0 ? keyboardHeight - insets.bottom + 8 : 25,
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
    marginTop: 4,
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
