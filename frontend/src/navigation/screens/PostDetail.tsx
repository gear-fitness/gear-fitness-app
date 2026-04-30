import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedPost, socialFeedApi } from "../../api/socialFeedApi";
import { FeedPostCard } from "../../components/FeedPostCard";
import { useSeedLikeState } from "../../context/LikesContext";
import { useTrackTab } from "../../hooks/useTrackTab";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";

type RootStackParamList = {
  PostDetail: {
    postId: string;
    openCommentsOnMount?: boolean;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, "PostDetail">;

export function PostDetail({ route }: Props) {
  useTrackTab("PostDetail");

  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { postId, openCommentsOnMount } = route.params;

  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seedLikeState = useSeedLikeState();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await socialFeedApi.getPost(postId);
        setPost(data);
        seedLikeState(data.postId, {
          serverLiked: data.likedByCurrentUser,
          serverCount: data.likeCount,
        });
      } catch (err: any) {
        console.error("Error loading post:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, seedLikeState]);

  const commentsOpenedRef = useRef(false);
  useEffect(() => {
    if (!openCommentsOnMount || commentsOpenedRef.current) return;
    commentsOpenedRef.current = true;
    const timer = setTimeout(() => {
      navigation.navigate("Comments", { postId });
      navigation.setParams({ openCommentsOnMount: undefined });
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const textMuted: StyleProp<TextStyle> = { color: colors.text, opacity: 0.5 };

  const backButton = <FloatingCloseButton direction="left" />;

  const bodyPaddingTop = insets.top + 68;

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        {backButton}
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading post...
        </Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        {backButton}
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error ? `Error: ${error}` : "Post not found"}
        </Text>
        <Text style={[styles.errorSubtext, textMuted]}>Post ID: {postId}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {backButton}
      <ScrollView
        contentContainerStyle={{
          paddingTop: bodyPaddingTop,
          paddingBottom: 40,
        }}
      >
        <FeedPostCard
          post={post}
          onOpenComments={(id) => navigation.navigate("Comments", { postId: id })}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
