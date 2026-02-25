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
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

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
      <Ionicons name="people-outline" size={72} color={colors.border} />
      <Text style={[styles.emptyText, { color: colors.text }]}>
        No workouts yet
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.text }]}>
        Follow people to see their activity
      </Text>
    </View>
  );

  // Shared header rendered in both loading and loaded states
  const renderHeader = () => (
    <>
      {/* Row 1: Title + Bell */}
      <View style={styles.headerRow}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>
          Community
        </Text>
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

      {/* Row 2: Full-width search bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name="search"
          size={20}
          color="#999"
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
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <ActivityModal
          visible={showActivity}
          onClose={() => setShowActivity(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

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
            <FeedPostCard post={item} />
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
  container: {
    flex: 1,
  },
  // ── Header ──
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // ── Search ──
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  // ── States ──
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  feedList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    opacity: 0.6,
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
