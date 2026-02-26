import { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  Keyboard,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useTheme,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { socialFeedApi, FeedPost } from "../../api/socialFeedApi";
import { searchUsers } from "../../api/userService";
import { getFollowActivity } from "../../api/followService";
import { FeedPostCard } from "../../components/FeedPostCard";
import { UserSearchCard } from "../../components/UserSearchCard";
import { useAuth } from "../../context/AuthContext";
import { ActivityModal } from "../../components/ActivityModal";
import { useTrackTab } from "../../hooks/useTrackTab";

const LAST_SEEN_KEY = "lastSeenActivityAt";

export function Social() {
  useTrackTab("Social");

  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Activity modal + unread state
  const [showActivity, setShowActivity] = useState(false);
  const [hasUnreadActivity, setHasUnreadActivity] = useState(false);
  const [lastSeenActivityAt, setLastSeenActivityAt] = useState<string | null>(
    null,
  );

  // ✅ NEW: hydration guard
  const [activityStateLoaded, setActivityStateLoaded] = useState(false);

  // 🔁 Load last-seen timestamp from storage (once)
  useEffect(() => {
    const loadLastSeen = async () => {
      const saved = await AsyncStorage.getItem(LAST_SEEN_KEY);
      if (saved) {
        setLastSeenActivityAt(saved);
      }
      setActivityStateLoaded(true); // ✅ critical
    };

    loadLastSeen();
  }, []);

  // Initial feed load
  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const response = await socialFeedApi.getFeed(0, 5);
      setPosts(response.content);
      setCurrentPage(0);
      setHasMore(!response.last);
    } catch (error) {
      console.error("Error loading feed:", error);
      Alert.alert("Error", "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await socialFeedApi.getFeed(0, 5);
      setPosts(response.content);
      setCurrentPage(0);
      setHasMore(!response.last);
    } catch (error) {
      console.error("Error refreshing feed:", error);
      Alert.alert("Error", "Failed to refresh feed");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Infinite scroll
  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const response = await socialFeedApi.getFeed(nextPage, 5);

      setPosts((prev) => [...prev, ...response.content]);
      setCurrentPage(nextPage);
      setHasMore(!response.last);
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // 🔔 Check for unread activity (SAFE)
  useFocusEffect(
    useCallback(() => {
      if (!activityStateLoaded) return;

      const checkActivity = async () => {
        try {
          const data = await getFollowActivity();
          if (!data || data.length === 0) return;

          const latestActivityAt = data
            .map((a: any) => new Date(a.createdAt))
            .sort((a, b) => b.getTime() - a.getTime())[0];

          if (!lastSeenActivityAt) return;

          if (latestActivityAt > new Date(lastSeenActivityAt)) {
            setHasUnreadActivity(true);
          }
        } catch {
          console.error("Failed to check activity");
        }
      };

      checkActivity();
    }, [lastSeenActivityAt, activityStateLoaded]),
  );

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

  // Comments
  const handleOpenComments = (postId: string) => {
    setSelectedPostId(postId);
    setCommentsVisible(true);
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.text }]}>
          Loading more...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={colors.text}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search users"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={colors.border} />
            </TouchableOpacity>
          )}
        </View>

        {/* 🔔 Bell */}
        <TouchableOpacity
          onPress={async () => {
            const now = new Date().toISOString();

            setHasUnreadActivity(false);
            setLastSeenActivityAt(now);
            await AsyncStorage.setItem(LAST_SEEN_KEY, now);

            setShowActivity(true);
          }}
          style={[
            styles.bellButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.bellWrapper}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.text}
            />
            {hasUnreadActivity && <View style={styles.redDot} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Feed */}
      {searchQuery.length > 0 ? (
        <FlatList
          data={userResults}
          keyExtractor={(item) => String(item.userId)}
          renderItem={({ item }) => (
            <UserSearchCard
              username={item.username}
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
          data={posts}
          renderItem={({ item }) => (
            <FeedPostCard post={item} onOpenComments={handleOpenComments} />
          )}
          keyExtractor={(item) => String(item.postId)}
          contentContainerStyle={
            posts.length === 0 ? styles.emptyContainer : styles.feedList
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
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

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },

  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },

  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },

  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
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
    paddingHorizontal: 16,
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
