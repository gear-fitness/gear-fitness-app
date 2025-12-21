import { useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
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

export function Social() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  /* ---------------- FEED ---------------- */

  const loadFeed = async () => {
    try {
      setLoading(true);
      const response = await socialFeedApi.getFeed(0, 5);
      setPosts(response.content);
      setCurrentPage(0);
      setHasMore(!response.last);
    } finally {
      setLoading(false);
    }
  };

  // Refresh feed whenever returning from profile (after follow)
  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await socialFeedApi.getFeed(0, 5);
      setPosts(response.content);
      setCurrentPage(0);
      setHasMore(!response.last);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const response = await socialFeedApi.getFeed(nextPage, 5);
      setPosts((prev) => [...prev, ...response.content]);
      setCurrentPage(nextPage);
      setHasMore(!response.last);
    } finally {
      setLoadingMore(false);
    }
  };

  /* ---------------- SEARCH ---------------- */

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
          setUserResults(results);
        } finally {
          setSearchingUsers(false);
        }
      };

      fetchUsers();
    }, [searchQuery])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* SEARCH BAR */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#777" />
          <TextInput
            placeholder="Search users"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SEARCH RESULTS (FEED HIDDEN WHILE SEARCHING) */}
      {searchQuery.length > 0 ? (
        <FlatList
          data={userResults}
          keyExtractor={(item) => item.userId}
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
              <ActivityIndicator style={{ marginTop: 20 }} />
            ) : null
          }
        />
      ) : (
        <FlatList
          data={posts}
          renderItem={({ item }) => <FeedPostCard post={item} />}
          keyExtractor={(item) => item.postId}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color="#bbb" />
              <Text style={styles.emptyTitle}>No workouts yet</Text>
              <Text style={styles.emptySub}>
                Follow people to see their activity
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  searchRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },

  empty: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },

  emptySub: {
    color: "#777",
    marginTop: 6,
    textAlign: "center",
  },
});
