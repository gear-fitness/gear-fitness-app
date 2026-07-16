import { useState, useEffect, useCallback, useRef, type Ref } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Dimensions,
} from "react-native";
import { Text, TextInput } from "../../components/Text";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import PagerView from "react-native-pager-view";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import {
  useTheme,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";

import { SearchUserResult } from "../../api/types";
import { searchUsers } from "../../api/userService";
import { notificationService } from "../../api/notificationService";
import { FeedPostCard } from "../../components/FeedPostCard";
import {
  PostUploadBar,
  usePostUploadHeadline,
} from "../../components/PostUploadBar";
import { SearchBar } from "../../components/SearchBar";
import { UserSearchCard } from "../../components/UserSearchCard";
import { useAuth } from "../../context/AuthContext";
import { FeedKey, useSocialFeed } from "../../context/SocialFeedContext";
import { useTrackTab } from "../../hooks/useTrackTab";
import { MINI_PLAYER_HEIGHT } from "../../components/WorkoutPlayer";
import { useHealthKitForegroundSync } from "../../hooks/useHealthKitSync";

const SEARCH_ROW_HEIGHT = 64;

// Page order for the swipeable pager; index <-> feed key.
const FEED_ORDER: FeedKey[] = ["following", "discover"];

type Feed = ReturnType<typeof useSocialFeed>;

/**
 * One feed's scrolling list, filling its pager page. Both feeds stay mounted
 * inside the pager, so each preserves its own native scroll position — swiping
 * or tapping between tabs is instant and never refetches or jumps. onScroll
 * drives the header hide/show (only the on-screen page emits scroll events).
 */
function FeedList({
  feed,
  variant,
  onScroll,
  onMomentumScrollEnd,
  onOpenComments,
  listRef,
  scrollsToTop,
  listHeader,
}: {
  feed: Feed;
  variant: FeedKey;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onMomentumScrollEnd?: () => void;
  onOpenComments: (postId: string) => void;
  listRef?: Ref<FlatList>;
  // iOS status-bar-tap scroll-to-top. Only the visible feed may enable it: the
  // gesture is ignored by iOS if more than one on-screen scroll view has it on.
  scrollsToTop?: boolean;
  // Transient row above the posts (the outbox upload bar). When present it
  // counts as content: the empty-state centering and the iOS header-inset
  // math below must treat the list as non-empty or the bar would render
  // centered mid-screen (or under the header).
  listHeader?: React.ReactElement | null;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const HEADER_HEIGHT = SEARCH_ROW_HEIGHT + insets.top;

  const renderFooter = () => {
    if (!feed.loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.text }]}>
          Loading more...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (feed.status === "loading" || feed.status === "idle") {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (variant === "discover") {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="compass-outline" size={64} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No public posts yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.text }]}>
            Check back soon to discover other people
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={64} color={colors.border} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No workouts yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.text }]}>
          Follow people to see their activity
        </Text>
      </View>
    );
  };

  const hasContent = feed.posts.length > 0 || listHeader != null;

  return (
    <View style={styles.flex1}>
      <FlatList
        ref={listRef}
        scrollsToTop={scrollsToTop}
        data={feed.posts}
        renderItem={({ item }) => (
          <FeedPostCard post={item} onOpenComments={onOpenComments} />
        )}
        keyExtractor={(item) => String(item.postId)}
        ListHeaderComponent={listHeader ?? undefined}
        scrollEnabled={hasContent}
        contentContainerStyle={
          !hasContent
            ? { flexGrow: 1, justifyContent: "center" }
            : {
                paddingTop: isIOS ? 0 : HEADER_HEIGHT - insets.top,
                paddingBottom: MINI_PLAYER_HEIGHT + 30,
              }
        }
        // Pin the inset deterministically. The list is nested (not the screen's
        // direct filling child), so iOS's automatic adjustment no longer adds
        // the top safe-area inset — disable it and apply the full HEADER_HEIGHT
        // ourselves so the first post clears the header instead of slipping
        // under it.
        contentInsetAdjustmentBehavior="never"
        contentInset={isIOS && hasContent ? { top: HEADER_HEIGHT } : undefined}
        contentOffset={
          isIOS && hasContent ? { x: 0, y: -HEADER_HEIGHT } : undefined
        }
        scrollIndicatorInsets={{ top: HEADER_HEIGHT }}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={feed.refresh}
            progressViewOffset={HEADER_HEIGHT}
          />
        }
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        onEndReached={() => void feed.loadMore()}
        onEndReachedThreshold={0.5}
      />

      {/* Empty state as a screen-anchored overlay (not inside the FlatList) so
          the RefreshControl's inset can't shift its position. Gated on the
          POSTS being empty, not on hasContent: the upload bar rides the top
          of an empty feed, and hiding the empty state under it would leave
          the rest of the screen blank. The two are meant to coexist (bar up
          top, "follow people" guidance centered below). */}
      {feed.posts.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          {renderEmpty()}
        </View>
      )}
    </View>
  );
}

export function Social() {
  useTrackTab("Social");
  useHealthKitForegroundSync();

  const { colors } = useTheme();
  const navigation = useNavigation() as any;
  const { user } = useAuth();
  const glassAvailable = isLiquidGlassAvailable();
  const insets = useSafeAreaInsets();

  // Following is primary/default. Discover shows all public posts so users can
  // find each other. Each feed is an independent store entry (own pagination,
  // scroll, staleness) keyed by FeedKey — Groups will slot in as more keys.
  // Both lists stay mounted (see FeedList), so they're always loaded and keep
  // their scroll; switching tabs just toggles which is visible.
  const [activeFeed, setActiveFeed] = useState<FeedKey>("following");
  const following = useSocialFeed("following");
  const discover = useSocialFeed("discover");
  const pagerRef = useRef<PagerView>(null);

  // Outbox upload bar ("Keep Gear open to finish posting..."), shown at the
  // top of both feeds while a post is being delivered. When the post lands,
  // refresh both feeds so the bar resolves into the real post in place. Only
  // the visible feed's instance animates its fill; the hidden one tracks by
  // direct set so an upload doesn't run two JS-driver animations.
  const handlePostDelivered = useCallback(() => {
    void following.refresh();
    void discover.refresh();
  }, [following.refresh, discover.refresh]);
  const upload = usePostUploadHeadline(handlePostDelivered);
  const uploadBarFor = (key: FeedKey) =>
    upload.headline ? (
      <PostUploadBar
        headline={upload.headline}
        fraction={upload.fraction}
        animate={activeFeed === key}
      />
    ) : null;

  // Per-feed list refs so a re-tap of the tab can scroll the *visible* feed to
  // top. Each list keeps its own scroll, so we only ever touch the active one.
  const followingListRef = useRef<FlatList>(null);
  const discoverListRef = useRef<FlatList>(null);

  // When a tab re-tap scrolls a feed to the top, we defer its refresh until the
  // scroll lands (onMomentumScrollEnd) so the RefreshControl's spinner-reveal
  // can't race the scroll. Holds the feed key awaiting that refresh, else null.
  const pendingRefreshRef = useRef<FeedKey | null>(null);

  // Tab tap -> page the swiper (which fires onPageSelected -> setActiveFeed).
  const goToFeed = (key: FeedKey) => {
    pagerRef.current?.setPage(FEED_ORDER.indexOf(key));
  };

  // Holds the latest re-tap handler. The tabPress listener below subscribes
  // once (only `navigation` is stable enough to depend on) and always invokes
  // the current handler via this ref, so the logic never reads a stale tab or
  // search state and we don't re-subscribe on every render. The handler itself
  // is (re)assigned further down, after search state/handlers are defined.
  const onActiveTabReTap = useRef<() => void>(() => {});

  // Instagram-style "tap the active tab again". The bottom tab fires tabPress
  // on every tap of the Explore icon — including when this screen is already
  // focused. That re-tap (isFocused) is our only trigger.
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      if (navigation.isFocused()) onActiveTabReTap.current();
    });
    return unsubscribe;
  }, [navigation]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [userResults, setUserResults] = useState<SearchUserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const [hasUnreadActivity, setHasUnreadActivity] = useState(false);
  // Measured width of the header slot, so the search bar can animate its width
  // from 0 to full (a left-to-right reveal). flex:1 has no fixed px width, so
  // we measure it via onLayout — but seed a screen-width estimate (row padding
  // 16*2 + gap 10*2 + two 40px buttons = 132) so it's never 0 before layout
  // lands, which would otherwise make the reveal animate to ~1px (invisible).
  const [slotWidth, setSlotWidth] = useState(() =>
    Math.max(0, Dimensions.get("window").width - 132),
  );

  const HEADER_HEIGHT = SEARCH_ROW_HEIGHT + insets.top;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const isHiddenRef = useRef(false);
  const lastYRef = useRef(0);

  // Collapsible search: 0 = collapsed (tabs shown), 1 = expanded (search bar
  // revealed over the tabs). Drives a width animation, so it must use the JS
  // driver (useNativeDriver: false) — width is not a native-animatable prop.
  const searchAnim = useRef(new Animated.Value(0)).current;
  const tabsOpacity = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  // Search bar grows from 0 to the full slot width, anchored on the left, so it
  // wipes open to the right. Inner content stays at full width and is clipped.
  const searchBarWidth = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, slotWidth || 1],
  });

  const openSearch = () => {
    setSearchExpanded(true);
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      searchInputRef.current?.focus();
    });
  };

  const closeSearch = () => {
    searchInputRef.current?.blur();
    setSearchQuery("");
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      setSearchExpanded(false);
    });
  };

  const toggleSearch = () => (searchExpanded ? closeSearch() : openSearch());

  // Re-tapping the Explore tab: bail out of search first; otherwise jump the
  // *visible* feed to top and refresh it. Reassigned every render so it always
  // closes over the current tab + search + refreshing state (see the ref/
  // listener wiring above). Routing by `activeFeed` keeps the other feed's
  // scroll position and data untouched.
  onActiveTabReTap.current = () => {
    if (searchExpanded) {
      closeSearch();
      return;
    }
    const isDiscover = activeFeed === "discover";
    const feed = isDiscover ? discover : following;
    const listRef = isDiscover ? discoverListRef : followingListRef;
    // The lists carry a top contentInset on iOS (HEADER_HEIGHT), so their
    // resting "top" sits at -HEADER_HEIGHT; Android's top is plain 0.
    const isIOS = Platform.OS === "ios";
    const topOffset = isIOS ? -(SEARCH_ROW_HEIGHT + insets.top) : 0;
    // When scrolled well away from the top on iOS, the RefreshControl's
    // spinner-reveal animation races an animated scroll-to-top and parks the
    // list short. So defer the refresh until the scroll actually lands
    // (onMomentumScrollEnd fires it). Otherwise — Android (its refresh spinner
    // is an overlay, no race) or already near the top (the scroll is a
    // no-op/negligible, and a no-op animated scroll emits no momentum event that
    // could carry a deferred refresh) — scroll and refresh together.
    if (isIOS && lastYRef.current > SEARCH_ROW_HEIGHT) {
      pendingRefreshRef.current = activeFeed;
      listRef.current?.scrollToOffset({ offset: topOffset, animated: true });
    } else {
      // animated:false on iOS so the tiny near-top scroll can't race the
      // immediate refresh; Android keeps its smooth scroll.
      listRef.current?.scrollToOffset({ offset: topOffset, animated: !isIOS });
      if (!feed.refreshing) void feed.refresh();
    }
  };

  const setHeaderHidden = (hidden: boolean) => {
    if (isHiddenRef.current === hidden) return;
    isHiddenRef.current = hidden;
    Animated.timing(headerAnim, {
      toValue: hidden ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SEARCH_ROW_HEIGHT],
    extrapolate: "clamp",
  });

  // One-time loads for both feeds (both pages are mounted and swipe-reachable,
  // so we load Discover up front to avoid an empty flash mid-swipe).
  // initialLoadIfNeeded is a no-op once a feed is loaded, so these never
  // refetch — the feeds stay loaded across tab focus (no refresh on open).
  useEffect(() => {
    following.initialLoadIfNeeded();
  }, [following.initialLoadIfNeeded]);

  useEffect(() => {
    discover.initialLoadIfNeeded();
  }, [discover.initialLoadIfNeeded]);

  const handleOpenComments = (postId: string) => {
    navigation.navigate("Comments", { postId });
  };

  // Header hide/show driven by the visible feed's scroll. (Only the visible
  // FeedList forwards onScroll.)
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - lastYRef.current;
    lastYRef.current = y;

    if (y <= SEARCH_ROW_HEIGHT) {
      setHeaderHidden(false);
      return;
    }
    if (delta > 3) setHeaderHidden(true);
    else if (delta < -3) setHeaderHidden(false);
  };

  // A deferred tab-re-tap refresh fires here, once the scroll-to-top has landed.
  // Only the visible feed emits scroll events, and only a pending re-tap sets
  // the ref — user-driven scrolls leave it null and are ignored.
  const onMomentumScrollEnd = () => {
    const key = pendingRefreshRef.current;
    if (!key) return;
    pendingRefreshRef.current = null;
    const feed = key === "discover" ? discover : following;
    if (!feed.refreshing) void feed.refresh();
  };

  // Search users (debounced so a fast typist doesn't fire a request per keystroke)
  useFocusEffect(
    useCallback(() => {
      if (!searchQuery.trim()) {
        setUserResults([]);
        return;
      }

      const timer = setTimeout(async () => {
        try {
          setSearchingUsers(true);
          const results = await searchUsers(searchQuery);

          const filteredResults = user
            ? results.filter((u) => u.userId !== user.userId)
            : results;

          setUserResults(filteredResults);
        } finally {
          setSearchingUsers(false);
        }
      }, 200);

      return () => clearTimeout(timer);
    }, [searchQuery, user]),
  );

  // Backend unread count
  useFocusEffect(
    useCallback(() => {
      const checkUnread = async () => {
        try {
          const count = await notificationService.getUnreadCount();
          setHasUnreadActivity(count > 0);
        } catch (error) {
          console.error("Failed to fetch unread count", error);
        }
      };

      checkUnread();
    }, []),
  );

  const renderTabs = () => (
    <View style={styles.tabsRow}>
      {(["following", "discover"] as FeedKey[]).map((key) => {
        const isActive = activeFeed === key;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => goToFeed(key)}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.text : colors.border },
              ]}
            >
              {key === "following" ? "Following" : "Discover"}
            </Text>
            {isActive && (
              <View
                style={[styles.tabUnderline, { backgroundColor: colors.text }]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Sticky safe-area strip — covers the notch/Dynamic Island, never animates */}
      <View
        style={[
          styles.safeAreaStrip,
          { height: insets.top, backgroundColor: colors.background },
        ]}
      />

      {/* Header row — slides up/down under the safe-area strip. Holds the
          Following/Discover tabs (collapsed) or the search input (expanded),
          plus the search-toggle and activity-bell buttons. */}
      <Animated.View
        style={[
          styles.searchRow,
          {
            top: insets.top,
            backgroundColor: colors.background,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        {/* Search-toggle on the left: tap to expand the search bar rightward. */}
        <TouchableOpacity
          onPress={toggleSearch}
          style={[
            styles.roundButton,
            {
              backgroundColor: glassAvailable ? "transparent" : colors.card,
              borderColor: glassAvailable ? "transparent" : colors.border,
            },
          ]}
          accessibilityLabel={searchExpanded ? "Close search" : "Search users"}
        >
          {glassAvailable && (
            <GlassView
              style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
              glassEffectStyle="regular"
              isInteractive
            />
          )}
          <Ionicons
            name={searchExpanded ? "close" : "search"}
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>

        <View
          style={styles.headerSlot}
          onLayout={(e) => setSlotWidth(e.nativeEvent.layout.width)}
        >
          {/* Tabs layer (visible when collapsed) */}
          <Animated.View
            pointerEvents={searchExpanded ? "none" : "auto"}
            style={[styles.headerLayer, { opacity: tabsOpacity }]}
          >
            {renderTabs()}
          </Animated.View>

          {/* Search bar layer — anchored left, width animates 0 -> full so it
              wipes open to the right. overflow:hidden clips the fixed-width
              input as the container grows. */}
          <Animated.View
            pointerEvents={searchExpanded ? "auto" : "none"}
            style={[styles.searchReveal, { width: searchBarWidth }]}
          >
            {/* Fixed-width input clipped by the animated parent, so the reveal
                wipes left-to-right without reflowing the input. */}
            <SearchBar
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search users"
              style={{ width: slotWidth }}
            />
          </Animated.View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Activity")}
          style={[
            styles.roundButton,
            {
              backgroundColor: glassAvailable ? "transparent" : colors.card,
              borderColor: glassAvailable ? "transparent" : colors.border,
            },
          ]}
        >
          {glassAvailable && (
            <GlassView
              style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
              glassEffectStyle="regular"
              isInteractive
            />
          )}
          <View style={styles.bellWrapper}>
            <Ionicons name="notifications" size={22} color={colors.text} />
            {hasUnreadActivity && <View style={styles.redDot} />}
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Swipeable pager: Following <-> Discover. Both pages stay mounted
          (keeping their own scroll). The native pager arbitrates horizontal
          swipe vs. the lists' vertical scroll / photo carousels, so it doesn't
          fight other gestures. Paging is disabled while searching; the results
          list overlays the pager (which stays mounted, preserving scroll). */}
      <View style={styles.content}>
        <PagerView
          ref={pagerRef}
          style={styles.flex1}
          initialPage={0}
          scrollEnabled={!searchExpanded}
          onPageSelected={(e) => {
            setActiveFeed(FEED_ORDER[e.nativeEvent.position] ?? "following");
          }}
        >
          <View key="following" style={styles.flex1} collapsable={false}>
            <FeedList
              feed={following}
              variant="following"
              onScroll={onScroll}
              onMomentumScrollEnd={onMomentumScrollEnd}
              onOpenComments={handleOpenComments}
              listRef={followingListRef}
              scrollsToTop={activeFeed === "following" && !searchExpanded}
              listHeader={uploadBarFor("following")}
            />
          </View>
          <View key="discover" style={styles.flex1} collapsable={false}>
            <FeedList
              feed={discover}
              variant="discover"
              onScroll={onScroll}
              onMomentumScrollEnd={onMomentumScrollEnd}
              onOpenComments={handleOpenComments}
              listRef={discoverListRef}
              scrollsToTop={activeFeed === "discover" && !searchExpanded}
              listHeader={uploadBarFor("discover")}
            />
          </View>
        </PagerView>

        {searchExpanded && (
          <View
            style={[
              styles.searchResults,
              { backgroundColor: colors.background },
            ]}
          >
            <FlatList
              data={userResults}
              keyExtractor={(item) => String(item.userId)}
              contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
              scrollIndicatorInsets={{ top: HEADER_HEIGHT }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <UserSearchCard
                  username={item.username}
                  displayName={item.displayName}
                  profilePictureUrl={item.profilePictureUrl}
                  followsCurrentUser={item.followsCurrentUser}
                  onPress={() => {
                    // push() (not navigate) so a fresh profile stacks on top
                    // instead of collapsing onto an existing UserProfile.
                    navigation.push("UserProfile", { username: item.username });
                  }}
                />
              )}
              ListEmptyComponent={
                searchingUsers ? (
                  <ActivityIndicator style={{ marginTop: 24 }} />
                ) : null
              }
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  content: { flex: 1 },

  flex1: { flex: 1 },

  safeAreaStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 11,
  },

  searchRow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 64,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },

  // Flexible slot holding the tabs/search-input layers (overlaid, cross-faded).
  headerSlot: {
    flex: 1,
    height: 40,
    justifyContent: "center",
  },

  headerLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },

  searchReveal: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    overflow: "hidden",
  },

  // Search results overlay the feeds while searching (feeds stay mounted under).
  searchResults: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },

  tabsRow: {
    flexDirection: "row",
    height: "100%",
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  tabLabel: {
    fontSize: 16,
    fontWeight: "600",
  },

  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 24,
    right: 24,
    height: 2,
    borderRadius: 1,
  },

  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  bellWrapper: { position: "relative" },

  redDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "red",
  },

  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },

  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },

  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },

  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },

  footerText: {
    marginTop: 8,
    fontSize: 14,
  },
});
