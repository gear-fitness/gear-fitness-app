import React, { useState, useEffect } from "react";
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
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import {
  getCurrentUserProfile,
  getUserProfile,
  getUserFollowers,
  followUser,
  unfollowUser,
  uploadProfilePicture,
} from "../../api/userService";
import { UserProfile, FollowerUser } from "../../api/types";
import { useTrackTab } from "../../hooks/useTrackTab";
import { socialFeedApi, FeedPost } from "../../api/socialFeedApi";
import { FeedPostCard } from "../../components/FeedPostCard";
import { Avatar } from "../../components/Avatar";

export function Profile() {
  useTrackTab("Profile");

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const usernameParam: string | undefined = route.params?.username;
  const isOtherUser = !!usernameParam;

  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  // Handle profile picture upload
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploading(true);
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 300 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      await uploadProfilePicture(manipulated.uri);
      await loadProfile();
    } catch (e) {
      Alert.alert("Error", "Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
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
            {!isOtherUser ? (
              <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
                <Avatar
                  username={profile.username}
                  profilePictureUrl={profile.profilePictureUrl}
                  size={110}
                />
                <View style={styles.cameraOverlay}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={18} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <Avatar
                username={profile.username}
                profilePictureUrl={profile.profilePictureUrl}
                size={110}
              />
            )}

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
                <Avatar
                  key={f.userId}
                  username={f.username}
                  profilePictureUrl={f.profilePictureUrl}
                  size={40}
                />
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

  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
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
