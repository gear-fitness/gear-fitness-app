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
  Image,
  Keyboard,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { socialFeedApi, FeedPost } from "../../api/socialFeedApi";
import { FollowModal } from "../../components/FollowModal";
import { FeedPostCard } from "../../components/FeedPostCard";
import { useTheme } from "@react-navigation/native";

export function Social() {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Initial load
  useEffect(() => {
    loadFeed();
  }, []);

  // Load initial feed
  const loadFeed = async () => {
    try {
      setLoading(true);
      const response = await socialFeedApi.getFeed(0, 3);
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
      const response = await socialFeedApi.getFeed(0, 3);
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
      const response = await socialFeedApi.getFeed(nextPage, 3);

      setPosts((prev) => [...prev, ...response.content]);
      setCurrentPage(nextPage);
      setHasMore(!response.last);
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
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
        Follow people to see their workouts!
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={() => setFollowModalVisible(true)}
      >
        <Text style={styles.emptyButtonText}>Find People to Follow</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
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
              placeholder="Search..."
              placeholderTextColor={colors.border}
              value={searchQuery}
              onChangeText={setSearchQuery}
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

          <TouchableOpacity
            style={[
              styles.followIconButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => setFollowModalVisible(true)}
          >
            <Ionicons name="person-add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
            placeholder="Search..."
            placeholderTextColor={colors.border}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={colors.border} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.followIconButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => setFollowModalVisible(true)}
        >
          <Ionicons name="person-add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Feed List with Infinite Scroll */}
      <FlatList
        data={posts}
        renderItem={({ item }) => <FeedPostCard post={item} />}
        keyExtractor={(item) => item.postId}
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

      <FollowModal
        visible={followModalVisible}
        onClose={() => setFollowModalVisible(false)}
        onSuccess={onRefresh}
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
  followIconButton: {
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
    padding: 16,
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
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
