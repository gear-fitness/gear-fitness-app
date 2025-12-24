import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Text, Button } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import avatar from "../../assets/avatar.png";
import {
  getCurrentUserProfile,
  getUserProfile,
  getUserFollowers,
  followUser,
  unfollowUser,
} from "../../api/userService";
import { UserProfile, FollowerUser } from "../../api/types";

export function Profile() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const usernameParam: string | undefined = route.params?.username;
  const isOtherUser = !!usernameParam;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- LOAD PROFILE ON FOCUS ---------------- */

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileData = usernameParam
        ? await getUserProfile(usernameParam)
        : await getCurrentUserProfile();

      setProfile(profileData);

      const followersData = await getUserFollowers(profileData.userId);
      setFollowers(followersData);
    } catch {
      setError("Failed to load profile");
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [usernameParam])
  );

  /* ---------------- FOLLOW / UNFOLLOW ---------------- */

  const handleFollowToggle = async () => {
    if (!profile) return;

    try {
      if (profile.isFollowing) {
        await unfollowUser(profile.userId);
      } else {
        await followUser(profile.userId);
      }

      loadProfile();
    } catch {
      Alert.alert("Error", "Failed to update follow status");
    }
  };

  const formatHeight = (h: number | null) =>
    h ? `${Math.floor(h / 12)}' ${h % 12}"` : "N/A";

  /* ---------------- STATES ---------------- */

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text>Failed to load profile</Text>
        <Button onPress={loadProfile}>Retry</Button>
      </View>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={{ flex: 1 }}>
      {/* CUSTOM BACK BUTTON (ONLY FOR OTHER USERS) */}
      {isOtherUser && (
        <View style={[styles.backButton, { top: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + (isOtherUser ? 40 : 0),
          paddingBottom: 40,
        }}
      >
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarWrapper}>
                <Image source={avatar} style={styles.avatar} />
              </View>

              <View>
                <Text style={styles.username}>{profile.username}</Text>
                <Text style={styles.handle}>@{profile.username}</Text>

                {isOtherUser && (
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      {
                        backgroundColor: profile.isFollowing
                          ? "#e5e5e5"
                          : "#007AFF",
                      },
                    ]}
                    onPress={handleFollowToggle}
                  >
                    <Text
                      style={{
                        color: profile.isFollowing ? "#000" : "#fff",
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
                <Ionicons name="settings-outline" size={28} color="#777" />
              </TouchableOpacity>
            )}
          </View>

          {/* STATS */}
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

          {/* FRIENDS */}
          <View style={styles.friendsSection}>
            <Text style={styles.sectionTitle}>Friends</Text>

            {followers.length === 0 ? (
              <Text style={styles.muted}>No followers yet</Text>
            ) : (
              <View style={styles.friendsRow}>
                {followers.slice(0, 5).map((f) => (
                  <View key={f.userId} style={styles.friend} />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- SMALL COMPONENT ---------------- */

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

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

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  },

  muted: { color: "#777" },
});
