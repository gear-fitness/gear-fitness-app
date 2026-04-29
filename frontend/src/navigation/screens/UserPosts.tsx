import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FeedPost, socialFeedApi } from "../../api/socialFeedApi";
import { Avatar } from "../../components/Avatar";
import { MINI_PLAYER_HEIGHT } from "../../components/WorkoutPlayer";
import { formatDurationShort, formatTimeAgo } from "../../utils/date";

const PAGE_SIZE = 20;

export function UserPosts() {
  const navigation = useNavigation() as any;
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const userId: string = route.params?.userId;
  const username: string = route.params?.username ?? "";

  const t = isDark
    ? {
        bg: "#0a0a0a",
        surface: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        border: "rgba(255,255,255,0.08)",
        chipBg: "rgba(255,255,255,0.08)",
      }
    : {
        bg: "#fafafa",
        surface: "#fff",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        textFaint: "rgba(0,0,0,0.4)",
        border: "rgba(0,0,0,0.08)",
        chipBg: "rgba(0,0,0,0.05)",
      };

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await socialFeedApi.getUserPosts(userId, 0, PAGE_SIZE);
        if (!active) return;
        setPosts(res.content);
        setPage(0);
        setHasMore(!res.last);
      } catch (e) {
        console.error("Error loading user posts:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    try {
      setLoadingMore(true);
      const next = page + 1;
      const res = await socialFeedApi.getUserPosts(userId, next, PAGE_SIZE);
      setPosts((prev) => [...prev, ...res.content]);
      setPage(next);
      setHasMore(!res.last);
    } catch (e) {
      console.error("Error loading more user posts:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenPost = (post: FeedPost) => {
    const parent = navigation.getParent?.() ?? navigation;
    parent.navigate("DetailedHistory", {
      workoutId: post.workoutId,
      caption: post.caption,
      workoutName: post.workoutName,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: t.bg,
            borderBottomColor: t.border,
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.backBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: t.text }]}>Posts</Text>
          {username ? (
            <Text style={[styles.subtitle, { color: t.textMuted }]}>
              @{username} · {posts.length}
            </Text>
          ) : null}
        </View>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <CompactPostCard
            post={item}
            theme={t}
            onPress={() => handleOpenPost(item)}
          />
        )}
        keyExtractor={(item) => String(item.postId)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 16,
          paddingBottom: MINI_PLAYER_HEIGHT + 30,
          gap: 10,
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={t.text} />
          ) : (
            <View style={styles.empty}>
              <Text style={{ color: t.textMuted, fontSize: 16 }}>
                No posts yet
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} color={t.text} />
          ) : null
        }
      />
    </View>
  );
}

type Theme = {
  surface: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  chipBg: string;
};

function CompactPostCard({
  post,
  theme: t,
  onPress,
}: {
  post: FeedPost;
  theme: Theme;
  onPress: () => void;
}) {
  const time = post.durationMin ? formatDurationShort(post.durationMin) : "—";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: t.surface, borderColor: t.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <Avatar
          username={post.username}
          profilePictureUrl={post.userProfilePictureUrl}
          size={24}
        />
        <Text style={[styles.timeAgo, { color: t.textFaint }]}>
          {formatTimeAgo(post.createdAt)}
        </Text>
      </View>

      <Text style={[styles.workoutName, { color: t.text }]} numberOfLines={2}>
        {post.workoutName}
      </Text>

      <View style={styles.metricsRow}>
        <View>
          <Text style={[styles.metricValue, { color: t.text }]}>{time}</Text>
          <Text style={[styles.metricLabel, { color: t.textFaint }]}>TIME</Text>
        </View>
        <View>
          <Text style={[styles.metricValue, { color: t.text }]}>
            {post.setCount}
          </Text>
          <Text style={[styles.metricLabel, { color: t.textFaint }]}>SETS</Text>
        </View>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: t.border }]}>
        <View style={styles.footerItem}>
          <Ionicons name="heart-outline" size={15} color={t.textMuted} />
          <Text style={[styles.footerText, { color: t.textMuted }]}>
            {post.likeCount}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="chatbubble-outline" size={15} color={t.textMuted} />
          <Text style={[styles.footerText, { color: t.textMuted }]}>
            {post.commentCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },

  row: {
    gap: 10,
  },
  loader: {
    padding: 32,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },

  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
    minHeight: 156,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeAgo: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  workoutName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: "auto",
    alignItems: "flex-end",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
  },
  metricLabel: {
    fontSize: 9,
    marginTop: 3,
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
  },
});
