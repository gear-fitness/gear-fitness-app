import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { Text } from "../../components/Text";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FeedPost, socialFeedApi } from "../../api/socialFeedApi";
import { LocationPageInfo, getLocationPage } from "../../api/locationService";
import { useNormalizeFeedPosts } from "../../context/LikesContext";
import { MINI_PLAYER_HEIGHT } from "../../components/WorkoutPlayer";
import { CompactPostCard } from "../../components/CompactPostCard";
import { FeedPostCard } from "../../components/FeedPostCard";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { OfflineNotice } from "../../components/OfflineNotice";
import { useTrackTab } from "../../hooks/useTrackTab";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

const PAGE_SIZE = 20;
const GRID_PADDING_HORIZONTAL = 12;
const GRID_GAP = 10;

type ViewMode = "grid" | "square";

/**
 * A gym's location page: header with the gym's identity and visible-post
 * stats, then every publicly visible post tagged there (discover-grade
 * audience, enforced server-side). Layout mirrors UserPosts — grid of
 * CompactPostCards with a toggle to full FeedPostCards.
 */
export function LocationPage() {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { width: windowWidth } = useWindowDimensions();

  useTrackTab("LocationPage");

  const params = (route.params ?? {}) as { locationId: string; name?: string };
  const locationId = params.locationId;
  // Name arrives via params so the header renders before the fetch lands.
  const initialName = params.name ?? "";

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

  const [info, setInfo] = useState<LocationPageInfo | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const normalizeFeedPosts = useNormalizeFeedPosts();
  const online = useOnlineStatus();

  const cardWidth = (windowWidth - GRID_PADDING_HORIZONTAL * 2 - GRID_GAP) / 2;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [pageInfo, res] = await Promise.all([
          getLocationPage(locationId),
          socialFeedApi.getLocationPosts(locationId, 0, PAGE_SIZE),
        ]);
        if (!active) return;
        setInfo(pageInfo);
        normalizeFeedPosts(res.content);
        setPosts(res.content);
        setPage(0);
        setHasMore(!res.last);
      } catch (e) {
        console.error("Error loading location page:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [locationId, normalizeFeedPosts]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    try {
      setLoadingMore(true);
      const next = page + 1;
      const res = await socialFeedApi.getLocationPosts(
        locationId,
        next,
        PAGE_SIZE,
      );
      normalizeFeedPosts(res.content);
      setPosts((prev) => [...prev, ...res.content]);
      setPage(next);
      setHasMore(!res.last);
    } catch (e) {
      console.error("Error loading more location posts:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const isGrid = viewMode === "grid";
  const name = info?.name ?? initialName;

  const header = (
    <View style={styles.headerBlock}>
      <View
        style={[
          styles.pinBadge,
          { backgroundColor: t.chipBg, borderColor: t.border },
        ]}
      >
        <Ionicons name="location-outline" size={30} color={t.text} />
      </View>
      <Text style={[styles.gymName, { color: t.text }]}>{name}</Text>
      {info?.address ? (
        <Text style={[styles.address, { color: t.textMuted }]}>
          {info.address}
        </Text>
      ) : null}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: t.text }]}>
            {info?.postCount ?? "–"}
          </Text>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>
            {info?.postCount === 1 ? "Post" : "Posts"}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: t.text }]}>
            {info?.athleteCount ?? "–"}
          </Text>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>
            {info?.athleteCount === 1 ? "Lifter" : "Lifters"}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!online) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <FloatingCloseButton direction="left" accessibilityLabel="Back" />
        <OfflineNotice message="Go back online to view this location." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
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
        <View style={styles.backBtn} />
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            {name || "Location"}
          </Text>
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
        ListHeaderComponent={header}
        contentContainerStyle={
          isGrid
            ? {
                paddingHorizontal: GRID_PADDING_HORIZONTAL,
                paddingBottom: MINI_PLAYER_HEIGHT + 30,
                gap: GRID_GAP,
              }
            : {
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
                No posts here yet
              </Text>
              <Text style={{ color: t.textFaint, fontSize: 13, marginTop: 4 }}>
                Tag this gym on a workout to be the first.
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
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  headerBlock: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  pinBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  gymName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  address: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 36,
    marginTop: 16,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 12,
    marginTop: 1,
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
