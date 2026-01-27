import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Text, Button } from "@react-navigation/elements";
import {
  useNavigation,
  useRoute,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  getCurrentUserProfile,
  getUserProfile,
  getUserFollowers,
  followUser,
  unfollowUser,
} from "../../api/userService";
import { UserProfile, FollowerUser } from "../../api/types";
import { useTrackTab } from "../../hooks/useTrackTab";
import { socialFeedApi, FeedPost } from "../../api/socialFeedApi";
import { FeedPostCard } from "../../components/FeedPostCard";
import { useWorkoutTimer } from "../../context/WorkoutContext";

export function Profile() {
  useTrackTab("Profile");

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { shouldRefreshProfile, clearProfileRefresh } = useWorkoutTimer();

  const usernameParam: string | undefined = route.params?.username;
  const isOtherUser = !!usernameParam;

  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  // Posts state management
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [currentPostsPage, setCurrentPostsPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  // Load profile data when screen is focused
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile data
      const profileData = usernameParam
        ? await getUserProfile(usernameParam)
        : await getCurrentUserProfile();

      setProfile(profileData);

      // Fetch followers
      const followersData = await getUserFollowers(profileData.userId);
      setFollowers(followersData);

      // Return profile data so it can be used immediately
      return profileData;
    } catch {
      setError("Failed to load profile");
      Alert.alert("Error", "Failed to load profile");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile().then((profileData) => {
      if (profileData) {
        loadUserPosts(profileData);
      }
    });
  }, [usernameParam]);

  // Only auto-refresh on first visit per session
  useFocusEffect(
    React.useCallback(() => {
      if (!hasLoadedOnce.current) {
        loadProfile().then((profileData) => {
          if (profileData) {
            loadUserPosts(profileData);
          }
        });
        hasLoadedOnce.current = true;
      }
    }, [])
  );

  // Refresh when triggered by workout completion
  useEffect(() => {
    if (shouldRefreshProfile) {
      loadProfile().then((profileData) => {
        if (profileData) {
          loadUserPosts(profileData);
        }
      });
      clearProfileRefresh();
    }
  }, [shouldRefreshProfile, clearProfileRefresh]);

  // Follow or unfollow user
  const handleFollowToggle = async () => {
    if (!profile) return;

    // Confirm before unfollowing
    if (profile.isFollowing) {
      Alert.alert(
        `Unfollow @${profile.username}?`,
        "Are you sure you want to unfollow this user?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unfollow",
            style: "destructive",
            onPress: async () => {
              try {
                await unfollowUser(profile.userId);
                loadProfile();
              } catch {
                Alert.alert("Error", "Failed to update follow status");
              }
            },
          },
        ]
      );
      return;
    }

    // Follow user
    try {
      await followUser(profile.userId);
      loadProfile();
    } catch {
      Alert.alert("Error", "Failed to update follow status");
    }
  };

  // Load user posts
  const loadUserPosts = async (profileData?: UserProfile) => {
    const targetProfile = profileData || profile;
    if (!targetProfile) return;
    try {
      setPostsLoading(true);
      const response = await socialFeedApi.getUserPosts(targetProfile.userId, 0, 5);
      setPosts(response.content);
      setCurrentPostsPage(0);
      setHasMorePosts(!response.last);
    } catch (error) {
      console.error("Error loading user posts:", error);
    } finally {
      setPostsLoading(false);
    }
  };

  // Load more posts when scrolling
  const loadMorePosts = async () => {
    if (!hasMorePosts || loadingMorePosts || postsLoading || !profile) return;
    try {
      setLoadingMorePosts(true);
      const nextPage = currentPostsPage + 1;
      const response = await socialFeedApi.getUserPosts(profile.userId, nextPage, 5);
      setPosts((prev) => [...prev, ...response.content]);
      setCurrentPostsPage(nextPage);
      setHasMorePosts(!response.last);
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMorePosts(false);
    }
  };

  // Handle opening comments modal
  const handleOpenComments = (postId: string) => {
    navigation.navigate("Comments", { postId });
  };

  // Format height from inches to feet and inches
  const formatHeight = (h: number | null) =>
    h ? `${Math.floor(h / 12)}' ${h % 12}"` : "N/A";

  // Profile Header Component
  const ProfileHeader = () => {
    if (!profile) return null;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarWrapper}>
              <Text style={styles.avatarLetter}>
                {profile.username.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View>
              <Text style={styles.username}>{profile.username}</Text>
              <Text style={styles.handle}>@{profile.username}</Text>

              {isOtherUser && (
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    profile.isFollowing
                      ? styles.unfollowButton
                      : { backgroundColor: "#007AFF" },
                  ]}
                  onPress={handleFollowToggle}
                >
                  <Text
                    style={{
                      color: profile.isFollowing ? "#FF3B30" : "#fff",
                      fontWeight: "600",
                    }}
                  >
                    {profile.isFollowing ? "Unfollow" : "Follow"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!isOtherUser && (
            <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
              <Ionicons
                name="settings-outline"
                size={40}
                color="#666"
                style={{ marginRight: 10, marginTop: -16 }}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <Stat
              label="Weight"
              value={profile.weightLbs ? `${profile.weightLbs}lbs` : "N/A"}
            />
            <Stat label="Height" value={formatHeight(profile.heightInches)} />
            <Stat label="Age" value={profile.age ?? "N/A"} />
          </View>

          <View style={styles.statsRow}>
            <Stat
              label="Workouts"
              value={profile.workoutStats.totalWorkouts}
            />
            <Stat label="Followers" value={profile.followersCount} />
            <Stat label="Following" value={profile.followingCount} />
          </View>
        </View>

        <View style={styles.friendsSection}>
          <Text style={styles.sectionTitle}>Friends</Text>

          {followers.length === 0 ? (
            <Text style={styles.muted}>No followers yet</Text>
          ) : (
            <View style={styles.friendsRow}>
              {followers.slice(0, 5).map((f) => (
                <View key={f.userId} style={styles.friend}>
                  <Text style={styles.friendLetter}>
                    {f.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.weekRow}>
          {(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const).map(
            (day) => (
              <View key={day} style={styles.dayItem}>
                <Text style={styles.dayLabel}>{day}</Text>
                <View
                  style={[
                    styles.dayCircle,
                    profile.workoutStats.weeklySplit[day] > 0
                      ? styles.dayActive
                      : styles.dayInactive,
                  ]}
                >
                  {profile.workoutStats.weeklySplit[day] > 0 && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </View>
              </View>
            )
          )}
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Posts</Text>
        </View>
      </View>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  // Show error state
  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text>Failed to load profile</Text>
        <Button onPress={loadProfile}>Retry</Button>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Back button for other users */}
      {isOtherUser && (
        <View style={[styles.backButton, { top: insets.top - 6 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={30} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <FeedPostCard post={item} onOpenComments={handleOpenComments} />
        )}
        keyExtractor={(item) => String(item.postId)}
        ListHeaderComponent={<ProfileHeader />}
        ListEmptyComponent={
          postsLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <View style={styles.emptyPosts}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMorePosts ? (
            <View style={styles.footer}>
              <ActivityIndicator />
              <Text style={styles.footerText}>Loading more...</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{
          paddingTop: insets.top + (isOtherUser ? 28 : 0),
          paddingBottom: 40,
        }}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadProfile().then((profileData) => {
              if (profileData) {
                loadUserPosts(profileData);
              }
            })}
          />
        }
      />
    </View>
  );
}

// Small stat component
function Stat({ label, value }: { label: string; value: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  container: { padding: 16 },

  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarLetter: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#666",
  },

  username: { fontSize: 24, fontWeight: "bold" },
  handle: { color: "#888", marginBottom: 6 },

  followButton: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  // iOS-style unfollow button
  unfollowButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#FF3B30",
  },

  statsSection: { marginTop: 24 },

  statsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },

  statLabel: { fontSize: 12, fontWeight: "600" },
  statValue: { color: "#777" },

  friendsSection: { marginTop: 24 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  friendsRow: {
    flexDirection: "row",
    gap: 12,
  },

  friend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },

  friendLetter: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    includeFontPadding: false,
  },

  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },

  dayItem: {
    alignItems: "center",
    flex: 1,
  },

  dayLabel: {
    fontSize: 12,
    marginBottom: 4,
  },

  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  dayActive: {
    backgroundColor: "#007AFF",
  },

  dayInactive: {
    backgroundColor: "#eee",
  },

  muted: { color: "#777" },

  postsSection: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 16,
  },

  emptyPosts: {
    padding: 32,
    alignItems: "center",
  },

  emptyText: {
    color: "#777",
    fontSize: 16,
  },

  loader: {
    padding: 32,
  },

  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },

  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: "#777",
  },
});
