import { useState, useEffect, useCallback, useRef } from "react";
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

import { socialFeedApi, FeedPost } from "../../api/socialFeedApi";
import { searchUsers } from "../../api/userService";
import { FeedPostCard } from "../../components/FeedPostCard";
import { UserSearchCard } from "../../components/UserSearchCard";
import { useAuth } from "../../context/AuthContext";
import { ActivityModal } from "../../components/ActivityModal";
import { useTrackTab } from "../../hooks/useTrackTab";

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
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const hasLoadedOnce = useRef(false);

  // Activity modal state
  const [showActivity, setShowActivity] = useState(false);

  // Initial load
  useEffect(() => {
    loadFeed();
  }, []);

  // Only auto-refresh on first visit per session
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce.current) {
        loadFeed();
        hasLoadedOnce.current = true;
      }
    }, [])
  );

  // Load initial feed
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

  // Load more posts (infinite scroll)
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
    }, [searchQuery, user])
  );

  const handleOpenComments = (postId: string) => {
    setSelectedPostId(postId);
    setCommentsVisible(true);
  };

  const handleCloseComments = () => {
    setCommentsVisible(false);
    setSelectedPostId(null);
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container]}>
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
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color={colors.border} />
              </TouchableOpacity>
            )}
          </View>

          {/* Bell icon */}
          <TouchableOpacity
            onPress={() => setShowActivity(true)}
            style={[
              styles.bellButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>

        {/* Activity Modal */}
        <ActivityModal
          visible={showActivity}
          onClose={() => setShowActivity(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
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

        {/* Bell icon */}
        <TouchableOpacity
          onPress={() => setShowActivity(true)}
          style={[
            styles.bellButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Feed List with Infinite Scroll */}
      {searchQuery.length > 0 ? (
        <FlatList
          data={userResults}
          keyExtractor={(item) => String(item.userId)}
          renderItem={({ item }) => {
            if (!item?.userId || !item?.username) return null;

            return (
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
            );
          }}
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

      {/* Activity Modal */}
      <ActivityModal
        visible={showActivity}
        onClose={() => setShowActivity(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  feedList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyContainer: {
    flex: 1,
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
