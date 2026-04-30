import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FeedPost, socialFeedApi } from "../../api/socialFeedApi";
import { useNormalizeFeedPosts } from "../../context/LikesContext";
import { MINI_PLAYER_HEIGHT } from "../../components/WorkoutPlayer";
import { CompactPostCard } from "../../components/CompactPostCard";
import { FeedPostCard } from "../../components/FeedPostCard";

const PAGE_SIZE = 20;
const GRID_PADDING_HORIZONTAL = 12;
const GRID_GAP = 10;

type ViewMode = "grid" | "square";

export function UserPosts() {
  const navigation = useNavigation() as any;
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { width: windowWidth } = useWindowDimensions();

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
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const normalizeFeedPosts = useNormalizeFeedPosts();

  const cardWidth =
    (windowWidth - GRID_PADDING_HORIZONTAL * 2 - GRID_GAP) / 2;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await socialFeedApi.getUserPosts(userId, 0, PAGE_SIZE);
        if (!active) return;
        normalizeFeedPosts(res.content);
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
  }, [userId, normalizeFeedPosts]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    try {
      setLoadingMore(true);
      const next = page + 1;
      const res = await socialFeedApi.getUserPosts(userId, next, PAGE_SIZE);
      normalizeFeedPosts(res.content);
      setPosts((prev) => [...prev, ...res.content]);
      setPage(next);
      setHasMore(!res.last);
    } catch (e) {
      console.error("Error loading more user posts:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const isGrid = viewMode === "grid";

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
        <TouchableOpacity
          onPress={() => setViewMode((v) => (v === "grid" ? "square" : "grid"))}
          hitSlop={10}
          style={styles.toggleBtn}
          accessibilityLabel="Toggle layout"
        >
          <Ionicons
            name={isGrid ? "grid-outline" : "square-outline"}
            size={24}
            color={t.text}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        key={viewMode}
        data={posts}
        renderItem={({ item }) =>
          isGrid ? (
            <CompactPostCard post={item} theme={t} width={cardWidth} />
          ) : (
            <FeedPostCard post={item} onOpenComments={() => {}} />
          )
        }
        keyExtractor={(item) => String(item.postId)}
        numColumns={isGrid ? 2 : 1}
        columnWrapperStyle={isGrid ? styles.row : undefined}
        contentContainerStyle={
          isGrid
            ? {
                paddingHorizontal: GRID_PADDING_HORIZONTAL,
                paddingTop: 16,
                paddingBottom: MINI_PLAYER_HEIGHT + 30,
                gap: GRID_GAP,
              }
            : {
                paddingTop: 16,
                paddingBottom: MINI_PLAYER_HEIGHT + 30,
              }
        }
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
  toggleBtn: {
    width: 32,
    height: 32,
    alignItems: "flex-end",
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
    gap: GRID_GAP,
  },
  loader: {
    padding: 32,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
});
