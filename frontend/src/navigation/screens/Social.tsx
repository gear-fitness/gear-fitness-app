import {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
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
} from "react-native";
import { Text } from "@react-navigation/elements";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import {
  useTheme,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";

import { FeedPost } from "../../api/socialFeedApi";
import { searchUsers } from "../../api/userService";
import { notificationService } from "../../api/notificationService";
import { FeedPostCard } from "../../components/FeedPostCard";
import { SearchBar } from "../../components/SearchBar";
import { UserSearchCard } from "../../components/UserSearchCard";
import { useAuth } from "../../context/AuthContext";
import { useSocialFeed } from "../../context/SocialFeedContext";
import { ActivityModal } from "../../components/ActivityModal";
import { useTrackTab } from "../../hooks/useTrackTab";
import { MINI_PLAYER_HEIGHT } from "../../components/WorkoutPlayer";
import { useHealthKitForegroundSync } from "../../hooks/useHealthKitSync";

export function Social() {
  useTrackTab("Social");
  useHealthKitForegroundSync();

  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const glassAvailable = isLiquidGlassAvailable();
  const insets = useSafeAreaInsets();

  const feed = useSocialFeed();

  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [showActivity, setShowActivity] = useState(false);
  const [hasUnreadActivity, setHasUnreadActivity] = useState(false);

  const flatListRef = useRef<FlatList<FeedPost>>(null);
  const restoredRef = useRef(false);
  const enableEndReachedRef = useRef(false);

  const SEARCH_ROW_HEIGHT = 64;
  const HEADER_HEIGHT = SEARCH_ROW_HEIGHT + insets.top;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const isHiddenRef = useRef(false);
  const lastYRef = useRef(0);

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

  // Cold-start load: only fires when the store is still in the "idle" state.
  useEffect(() => {
    feed.initialLoadIfNeeded();
  }, [feed.initialLoadIfNeeded]);

  // If an invalidation flag was set while we were on another screen, refresh on focus.
  // No-ops if the data isn't stale.
  useFocusEffect(
    useCallback(() => {
      feed.refreshIfStaleAndHidden();
    }, [feed.refreshIfStaleAndHidden]),
  );

  // Restore scroll offset after the FlatList has laid out posts. Guards prevent
  // (a) re-running on every render, (b) firing onEndReached during the programmatic scroll.
  useLayoutEffect(() => {
    if (restoredRef.current) return;
    if (feed.posts.length === 0) return;
    const offset = feed.getScrollOffset();
    if (offset <= 0) {
      restoredRef.current = true;
      enableEndReachedRef.current = true;
      return;
    }
    flatListRef.current?.scrollToOffset({ offset, animated: false });
    restoredRef.current = true;
    const id = setTimeout(() => {
      enableEndReachedRef.current = true;
    }, 250);
    return () => clearTimeout(id);
  }, [feed.posts.length, feed.getScrollOffset]);

  const handleOpenComments = (postId: string) => {
    navigation.navigate("Comments", { postId });
  };

  const isIOS = Platform.OS === "ios";

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - lastYRef.current;
    lastYRef.current = y;
    feed.setScrollOffset(y);

    if (y <= SEARCH_ROW_HEIGHT) {
      setHeaderHidden(false);
      return;
    }
    if (delta > 3) setHeaderHidden(true);
    else if (delta < -3) setHeaderHidden(false);
  };

  // Search users
  useFocusEffect(
    useCallback(() => {
      if (!searchQuery.trim()) {
        setUserResults([]);
        return;
      }

      const fetchUsers = async () => {
        try {
          setSearchingUsers(true);
          const results = await searchUsers(searchQuery);

          const filteredResults = user
            ? results.filter((u: any) => u.userId !== user.userId)
            : results;

          setUserResults(filteredResults);
        } finally {
          setSearchingUsers(false);
        }
      };

      fetchUsers();
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

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Sticky safe-area strip — covers the notch/Dynamic Island, never animates */}
      <View
        style={[
          styles.safeAreaStrip,
          { height: insets.top, backgroundColor: colors.background },
        ]}
      />

      {/* Search Bar — slides up/down under the safe-area strip */}
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
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search users"
          style={styles.searchBar}
        />

        <TouchableOpacity
          onPress={() => setShowActivity(true)}
          style={[
            styles.bellButton,
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

      {searchQuery.length > 0 ? (
        <FlatList
          data={userResults}
          keyExtractor={(item) => String(item.userId)}
          contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
          scrollIndicatorInsets={{ top: HEADER_HEIGHT }}
          renderItem={({ item }) => (
            <UserSearchCard
              username={item.username}
              profilePictureUrl={item.profilePictureUrl}
              onPress={() => {
                setSearchQuery("");
                setUserResults([]);
                navigation.navigate("UserProfile", {
                  username: item.username,
                });
              }}
            />
          )}
          ListEmptyComponent={
            searchingUsers ? (
              <ActivityIndicator style={{ marginTop: 24 }} />
            ) : null
          }
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={feed.posts}
          renderItem={({ item }) => (
            <FeedPostCard post={item} onOpenComments={handleOpenComments} />
          )}
          keyExtractor={(item) => String(item.postId)}
          contentContainerStyle={
            feed.posts.length === 0
              ? {
                  ...styles.emptyContainer,
                  paddingTop: isIOS ? 0 : HEADER_HEIGHT - insets.top,
                }
              : {
                  paddingTop: isIOS ? 0 : HEADER_HEIGHT - insets.top,
                  paddingBottom: MINI_PLAYER_HEIGHT + 30,
                }
          }
          contentInset={isIOS ? { top: HEADER_HEIGHT - insets.top } : undefined}
          contentOffset={
            isIOS ? { x: 0, y: -(HEADER_HEIGHT - insets.top) } : undefined
          }
          scrollIndicatorInsets={{ top: HEADER_HEIGHT }}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={feed.refreshing}
              onRefresh={feed.refresh}
              progressViewOffset={HEADER_HEIGHT}
            />
          }
          onScroll={onScroll}
          scrollEventThrottle={16}
          onEndReached={() => {
            if (!enableEndReachedRef.current) return;
            void feed.loadMore();
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      <ActivityModal
        visible={showActivity}
        onClose={() => setShowActivity(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

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

  searchBar: { flex: 1 },

  bellButton: {
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

  feedList: {
    paddingVertical: 20,
  },

  emptyContainer: { flex: 1 },

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
