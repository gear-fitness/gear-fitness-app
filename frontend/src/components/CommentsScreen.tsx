import { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Text,
  Keyboard,
  KeyboardEvent,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useRoute, useNavigation } from "@react-navigation/native";
import { socialFeedApi, Comment } from "../api/socialFeedApi";
import { reportService, ReportReason } from "../api/reportService";
import { blockUser } from "../api/followService";
import { useAuth } from "../context/AuthContext";
import { parseServerDate } from "../utils/date";
import { Avatar } from "./Avatar";
import { PostActionsSheet, PostAction } from "./PostActionsSheet";
import { ReportCommentSheet } from "./ReportCommentSheet";
import { MentionableText } from "./MentionableText";
import { MentionTextInput } from "./MentionTextInput";

export function CommentsScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const postId = route.params?.postId;
  const postOwnerId: string | undefined = route.params?.postOwnerId;
  const focusCommentId: string | undefined = route.params?.focusCommentId;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const goToProfile = (username: string) => {
    navigation.goBack();
    setTimeout(() => {
      navigation.push("UserProfile", { username });
    }, 200);
  };

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Replies: lazily loaded per top-level comment.
  const [repliesByParent, setRepliesByParent] = useState<
    Record<string, Comment[]>
  >({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<{
    commentId: string;
    username: string;
  } | null>(null);

  // Per-comment 3-dot menu (report / block / delete), mirroring the post sheet.
  const [actionTarget, setActionTarget] = useState<Comment | null>(null);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);

  // Defer opening the next sheet until the actions sheet has finished closing,
  // so two bottom sheets never stack on iOS (mirrors usePostMenu).
  const pendingActionRef = useRef<(() => void) | null>(null);
  const closeActionsThen = (fn: () => void) => {
    pendingActionRef.current = fn;
    setShowActionsSheet(false);
  };
  const onActionsSheetClosed = () => {
    const fn = pendingActionRef.current;
    pendingActionRef.current = null;
    fn?.();
  };

  const openCommentMenu = (item: Comment) => {
    setActionTarget(item);
    setShowActionsSheet(true);
  };

  const confirmDelete = (item: Comment) => {
    Alert.alert("Delete comment?", "This comment will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await socialFeedApi.deleteComment(postId, item.commentId);
            if (item.parentCommentId) {
              const parentId = item.parentCommentId;
              setRepliesByParent((prev) => ({
                ...prev,
                [parentId]: (prev[parentId] || []).filter(
                  (c) => c.commentId !== item.commentId,
                ),
              }));
              setComments((prev) =>
                prev.map((c) =>
                  c.commentId === parentId
                    ? { ...c, replyCount: Math.max(0, (c.replyCount || 1) - 1) }
                    : c,
                ),
              );
            } else {
              setComments((prev) =>
                prev.filter((c) => c.commentId !== item.commentId),
              );
              setRepliesByParent((prev) => {
                const next = { ...prev };
                delete next[item.commentId];
                return next;
              });
            }
          } catch {
            Alert.alert("Couldn't delete", "Please try again in a moment.");
          }
        },
      },
    ]);
  };

  const removeUserEverywhere = (userId: string) => {
    // Count removed replies per parent so reply counts stay in sync.
    const removedPerParent: Record<string, number> = {};
    for (const [parentId, replies] of Object.entries(repliesByParent)) {
      const removed = replies.filter((c) => c.userId === userId).length;
      if (removed > 0) removedPerParent[parentId] = removed;
    }
    setRepliesByParent((prev) => {
      const next: Record<string, Comment[]> = {};
      for (const [parentId, replies] of Object.entries(prev)) {
        next[parentId] = replies.filter((c) => c.userId !== userId);
      }
      return next;
    });
    setComments((prev) =>
      prev
        .filter((c) => c.userId !== userId)
        .map((c) =>
          removedPerParent[c.commentId]
            ? {
                ...c,
                replyCount: Math.max(
                  0,
                  (c.replyCount || 0) - removedPerParent[c.commentId],
                ),
              }
            : c,
        ),
    );
  };

  const confirmBlock = (item: Comment) => {
    Alert.alert(
      `Block @${item.username}?`,
      "They won't be able to see your posts or follow you, and you won't see theirs.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(item.userId);
              removeUserEverywhere(item.userId);
            } catch {
              Alert.alert("Couldn't block", "Failed to block this user.");
            }
          },
        },
      ],
    );
  };

  const submitReport = async (reason: ReportReason, note?: string) => {
    setShowReportSheet(false);
    const target = actionTarget;
    if (!target) return;
    try {
      await reportService.reportComment(target.commentId, reason, note);
      Alert.alert(
        "Report submitted",
        "Thanks for letting us know. Our team will review this comment.",
      );
    } catch (e: any) {
      if (e?.response?.status === 409) {
        Alert.alert("Already reported", "You've already reported this comment.");
      } else {
        Alert.alert("Couldn't submit report", "Please try again in a moment.");
      }
    }
  };

  const buildActions = (item: Comment): PostAction[] => {
    const isOwn = !!user?.userId && item.userId === user.userId;
    const isPostOwner = !!postOwnerId && postOwnerId === user?.userId;
    const actions: PostAction[] = [];
    if (!isOwn) {
      actions.push({
        key: "report",
        icon: "flag-outline",
        label: "Report",
        onPress: () => closeActionsThen(() => setShowReportSheet(true)),
      });
      actions.push({
        key: "block",
        icon: "ban-outline",
        label: "Block",
        destructive: true,
        onPress: () => closeActionsThen(() => confirmBlock(item)),
      });
    }
    if (isOwn || isPostOwner) {
      actions.push({
        key: "delete",
        icon: "trash-outline",
        label: "Delete",
        destructive: true,
        onPress: () => closeActionsThen(() => confirmDelete(item)),
      });
    }
    return actions;
  };

  const loadReplies = async (commentId: string) => {
    setLoadingReplies((prev) => new Set(prev).add(commentId));
    try {
      // Replies are small; load up to 100 in one page (oldest-first).
      const response = await socialFeedApi.getReplies(postId, commentId, 0, 100);
      setRepliesByParent((prev) => ({
        ...prev,
        [commentId]: response.content,
      }));
    } catch (error) {
      console.error("Error loading replies:", error);
    } finally {
      setLoadingReplies((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
        if (repliesByParent[commentId] === undefined) {
          void loadReplies(commentId);
        }
      }
      return next;
    });
  };

  const startReply = (item: Comment) => {
    setReplyTo({ commentId: item.commentId, username: item.username });
    setCommentText((prev) => {
      const mention = `@${item.username} `;
      return prev.startsWith(mention) ? prev : mention;
    });
  };

  const cancelReply = () => {
    setReplyTo(null);
    setCommentText("");
  };

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

  // When arriving from a reply/mention notification, auto-expand that thread.
  const focusedRef = useRef(false);
  useEffect(() => {
    if (focusedRef.current || !focusCommentId) return;
    if (comments.some((c) => c.commentId === focusCommentId)) {
      focusedRef.current = true;
      setExpanded((prev) => new Set(prev).add(focusCommentId));
      if (repliesByParent[focusCommentId] === undefined) {
        void loadReplies(focusCommentId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCommentId, comments]);

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
        replyTo?.commentId,
      );
      if (newComment.parentCommentId) {
        // Reply: bump the thread root's count and expand it.
        const parentId = newComment.parentCommentId;
        setComments((prev) =>
          prev.map((c) =>
            c.commentId === parentId
              ? { ...c, replyCount: (c.replyCount || 0) + 1 }
              : c,
          ),
        );
        setExpanded((prev) => new Set(prev).add(parentId));
        if (repliesByParent[parentId] === undefined) {
          // Thread not loaded yet — fetch the full list (includes this reply)
          // rather than seeding a 1-of-N array that hides the others.
          void loadReplies(parentId);
        } else {
          setRepliesByParent((prev) => ({
            ...prev,
            [parentId]: [...(prev[parentId] || []), newComment],
          }));
        }
      } else {
        setComments((prev) => [newComment, ...prev]);
      }
      setCommentText("");
      setReplyTo(null);
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

  const renderRow = (item: Comment, isReply: boolean) => (
    <View style={styles.commentItem}>
      <TouchableOpacity
        onPress={() => goToProfile(item.username)}
        activeOpacity={0.7}
      >
        <Avatar
          username={item.username}
          profilePictureUrl={item.userProfilePictureUrl}
          size={isReply ? 28 : 36}
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
          <TouchableOpacity
            onPress={() => openCommentMenu(item)}
            hitSlop={10}
            accessibilityLabel="More options"
            style={styles.menuButton}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={16}
              color={colors.text}
              style={{ opacity: 0.6 }}
            />
          </TouchableOpacity>
        </View>
        <MentionableText
          text={item.body}
          style={[styles.commentBody, { color: colors.text }]}
          onPressMention={goToProfile}
        />
        <TouchableOpacity
          onPress={() => startReply(item)}
          hitSlop={8}
          style={styles.replyButton}
        >
          <Text
            style={[styles.replyButtonText, { color: colors.text, opacity: 0.6 }]}
          >
            Reply
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderComment = ({ item }: { item: Comment }) => {
    const replyCount = item.replyCount || 0;
    const isExpanded = expanded.has(item.commentId);
    const replies = repliesByParent[item.commentId] || [];
    const isLoading = loadingReplies.has(item.commentId);
    return (
      <View>
        {renderRow(item, false)}
        {replyCount > 0 && (
          <TouchableOpacity
            onPress={() => toggleReplies(item.commentId)}
            style={styles.viewRepliesButton}
            hitSlop={6}
          >
            <View style={[styles.replyLine, { backgroundColor: colors.border }]} />
            <Text
              style={[
                styles.viewRepliesText,
                { color: colors.text, opacity: 0.6 },
              ]}
            >
              {isExpanded
                ? "Hide replies"
                : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
            </Text>
          </TouchableOpacity>
        )}
        {isExpanded && (
          <View style={styles.repliesContainer}>
            {replies.map((reply) => (
              <View key={reply.commentId}>{renderRow(reply, true)}</View>
            ))}
            {isLoading && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: 8 }}
              />
            )}
          </View>
        )}
      </View>
    );
  };

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
        style={{
          marginBottom:
            keyboardHeight > 0 ? keyboardHeight - insets.bottom + 8 : 25,
        }}
      >
        {replyTo && (
          <View style={[styles.replyBanner, { borderColor: colors.border }]}>
            <Text
              style={[styles.replyBannerText, { color: colors.text }]}
              numberOfLines={1}
            >
              Replying to @{replyTo.username}
            </Text>
            <TouchableOpacity onPress={cancelReply} hitSlop={10}>
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
        <View
          style={[
            styles.inputRow,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          <MentionTextInput
            containerStyle={{ flex: 1 }}
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text },
            ]}
            placeholder={replyTo ? "Add a reply..." : "Add a comment..."}
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
      </View>

      <PostActionsSheet
        visible={showActionsSheet}
        actions={actionTarget ? buildActions(actionTarget) : []}
        onClose={() => setShowActionsSheet(false)}
        onClosed={onActionsSheetClosed}
      />
      <ReportCommentSheet
        visible={showReportSheet}
        onSubmit={submitReport}
        onClose={() => setShowReportSheet(false)}
      />
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
  menuButton: {
    marginLeft: "auto",
    paddingHorizontal: 4,
  },
  commentBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  replyButton: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  replyButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  viewRepliesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 48,
    marginBottom: 6,
  },
  replyLine: {
    width: 24,
    height: StyleSheet.hairlineWidth,
  },
  viewRepliesText: {
    fontSize: 12,
    fontWeight: "600",
  },
  repliesContainer: {
    marginLeft: 36,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 10,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  replyBannerText: {
    fontSize: 13,
    flex: 1,
    opacity: 0.8,
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
