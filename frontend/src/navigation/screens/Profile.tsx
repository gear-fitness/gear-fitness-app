import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Text,
  useColorScheme,
} from "react-native";
import { Button } from "@react-navigation/elements";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import {
  getCurrentUserProfile,
  getUserProfile,
  followUser,
  unfollowUser,
} from "../../api/userService";
import { UserProfile } from "../../api/types";
import { useTrackTab } from "../../hooks/useTrackTab";
import { socialFeedApi, FeedPost } from "../../api/socialFeedApi";
import { FeedPostCard } from "../../components/FeedPostCard";
import { MINI_PLAYER_HEIGHT } from "../../components/WorkoutPlayer";
import { feedRefresh } from "../../utils/feedRefreshFlag";
import { Avatar } from "../../components/Avatar";

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const GRID_ROWS = 5;
const GRID_COLS = 7;

export function Profile() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation() as any;
  const route = useRoute<any>();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const usernameParam: string | undefined = route.params?.username;
  const isOtherUser = !!usernameParam;

  useTrackTab(isOtherUser ? "UserProfile" : "Profile");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const t = isDark
    ? {
        bg: "#0a0a0a",
        surface: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        border: "rgba(255,255,255,0.08)",
        primaryBg: "#fff",
        primaryText: "#000",
        dotEmpty: "rgba(255,255,255,0.06)",
        dotLow: "#4a2a12",
        dotMid: "#8a4716",
        dotHigh: "#ff6a1f",
      }
    : {
        bg: "#fafafa",
        surface: "#fff",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        textFaint: "rgba(0,0,0,0.4)",
        border: "rgba(0,0,0,0.08)",
        primaryBg: "#000",
        primaryText: "#fff",
        dotEmpty: "rgba(0,0,0,0.06)",
        dotLow: "#ffd2a8",
        dotMid: "#ff9d5c",
        dotHigh: "#e56a1f",
      };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = usernameParam
        ? await getUserProfile(usernameParam)
        : await getCurrentUserProfile();
      setProfile(profileData);
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

  const handleFollowToggle = async () => {
    if (!profile) return;

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
                feedRefresh.needed = true;
                loadProfile();
              } catch {
                Alert.alert("Error", "Failed to update follow status");
              }
            },
          },
        ],
      );
      return;
    }

    try {
      await followUser(profile.userId);
      feedRefresh.needed = true;
      loadProfile();
    } catch {
      Alert.alert("Error", "Failed to update follow status");
    }
  };

  const loadUserPosts = async (profileData?: UserProfile) => {
    const targetProfile = profileData || profile;
    if (!targetProfile) return;
    try {
      setPostsLoading(true);
      const response = await socialFeedApi.getUserPosts(
        targetProfile.userId,
        0,
        1,
      );
      setPosts(response.content);
    } catch (error) {
      console.error("Error loading user posts:", error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleOpenComments = (postId: string) => {
    navigation.navigate("Comments", { postId });
  };

  const ProfileHeader = () => {
    if (!profile) return null;
    const primaryName = profile.displayName?.trim() || profile.username;
    const streak = profile.workoutStats.workoutStreak ?? 0;

    const today = new Date();
    const todayDow = today.getDay();
    const todayIdx = (GRID_ROWS - 1) * GRID_COLS + todayDow;

    const activity =
      profile.workoutStats.dailyActivity ??
      Array<number>(GRID_ROWS * GRID_COLS).fill(0);

    const dotColor = (level: number) =>
      level === 0
        ? t.dotEmpty
        : level === 1
          ? t.dotLow
          : level === 2
            ? t.dotMid
            : t.dotHigh;

    return (
      <View>
        <View style={styles.identityRow}>
          <Avatar
            username={profile.username}
            profilePictureUrl={profile.profilePictureUrl}
            size={96}
          />
          <View style={styles.identityText}>
            <Text
              style={[styles.displayName, { color: t.text }]}
              numberOfLines={1}
            >
              {primaryName}
            </Text>
            <Text style={[styles.handle, { color: t.textMuted }]}>
              @{profile.username}
            </Text>
          </View>
        </View>

        <View style={styles.statsWrap}>
          <View style={styles.statsRow}>
            <Stat
              theme={t}
              label="WORKOUTS"
              value={profile.workoutStats.totalWorkouts}
            />
            <Stat theme={t} label="FOLLOWERS" value={profile.followersCount} />
            <Stat theme={t} label="FOLLOWING" value={profile.followingCount} />
          </View>

          {isOtherUser && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleFollowToggle}
              style={[
                styles.followBtn,
                profile.isFollowing
                  ? {
                      backgroundColor: "transparent",
                      borderWidth: 1,
                      borderColor: t.border,
                    }
                  : { backgroundColor: t.primaryBg },
              ]}
            >
              <Text
                style={[
                  styles.followBtnText,
                  { color: profile.isFollowing ? t.text : t.primaryText },
                ]}
              >
                {profile.isFollowing ? "Unfollow" : "Follow"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.overline, { color: t.textMuted }]}>
              ACTIVITY
            </Text>
            <View style={styles.streakInline}>
              <Svg width={22} height={25} viewBox="0 0 16 18" fill="none">
                <Path
                  d="M8 1.5c.8 2.6 3 3.8 3 6.8 0 1.4-.7 2.6-1.8 3.3.4-.6.5-1.4.2-2.3-.3-1-1.1-1.6-1.4-2.6C7.2 9 6 10 6 11.7c0 .6.2 1.2.4 1.7C5.3 12.7 4.5 11.4 4.5 10c0-2.5 1.6-3.8 2.6-5.8.4-.8.7-1.8.9-2.7Z"
                  stroke="#FF6A1F"
                  strokeWidth={1.3}
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
              <Text style={[styles.streakNumber, { color: t.text }]}>
                {streak}
              </Text>
            </View>
          </View>

          <View style={styles.weekLabels}>
            {WEEK_LABELS.map((d, i) => (
              <View key={i} style={styles.labelCell}>
                <Text style={[styles.dayLabel, { color: t.textFaint }]}>
                  {d}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.gridWrap}>
            {Array.from({ length: GRID_ROWS }).map((_, row) => (
              <View key={row} style={styles.gridRow}>
                {Array.from({ length: GRID_COLS }).map((_, col) => {
                  const idx = row * GRID_COLS + col;
                  const isToday = idx === todayIdx;
                  return (
                    <View key={col} style={styles.dotCell}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: dotColor(activity[idx]) },
                        ]}
                      />
                      {isToday && (
                        <View
                          style={[styles.dotRing, { borderColor: t.text }]}
                          pointerEvents="none"
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.postsSectionHeader}>
          <Text style={[styles.overline, { color: t.textMuted }]}>POSTS</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("UserPosts", {
                userId: profile.userId,
                username: profile.username,
              })
            }
            hitSlop={10}
            style={styles.seeAllBtn}
          >
            <Text style={[styles.seeAllText, { color: t.text }]}>See all</Text>
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path
                d="M4.5 2.5L8 6l-3.5 3.5"
                stroke={t.text}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.text} />
        <Text style={{ color: t.text, marginTop: 8 }}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.text }}>Failed to load profile</Text>
        <Button onPress={loadProfile}>Retry</Button>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {isOtherUser ? (
        <View style={[styles.topLeftBtn, { top: insets.top + 2 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={10}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={28} color={t.text} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.topRightBtn, { top: insets.top + 2 }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            hitSlop={10}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={28} color={t.text} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: MINI_PLAYER_HEIGHT + 30,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            tintColor={t.text}
            onRefresh={() =>
              loadProfile().then((profileData) => {
                if (profileData) {
                  loadUserPosts(profileData);
                }
              })
            }
          />
        }
      >
        <ProfileHeader />
        {posts.length > 0 ? (
          <FeedPostCard
            post={posts[0]}
            onOpenComments={handleOpenComments}
          />
        ) : postsLoading ? (
          <ActivityIndicator style={styles.loader} color={t.text} />
        ) : (
          <View style={styles.emptyPosts}>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              No posts yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({
  theme,
  label,
  value,
}: {
  theme: { text: string; textMuted: string };
  label: string;
  value: number | string;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const DOT_SIZE = 28;
const RING_SIZE = 36;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  topLeftBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  topRightBtn: {
    position: "absolute",
    right: 16,
    zIndex: 10,
  },

  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 20,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.7,
    lineHeight: 32,
  },
  handle: {
    fontSize: 15,
    marginTop: 4,
  },

  statsWrap: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  statCell: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -1,
    lineHeight: 34,
    fontVariant: ["tabular-nums"],
  },

  followBtn: {
    marginTop: 18,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  followBtnText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  activitySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  overline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  streakInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  streakNumber: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 24,
    fontVariant: ["tabular-nums"],
  },

  weekLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  labelCell: {
    width: DOT_SIZE,
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  gridWrap: {
    gap: 5,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  dotCell: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
  },

  postsSectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.1,
  },

  emptyPosts: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },

  loader: {
    padding: 32,
  },
});
