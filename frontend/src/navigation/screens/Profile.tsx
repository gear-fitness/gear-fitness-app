import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Text,
  Animated,
  Easing,
} from "react-native";
import { Button } from "@react-navigation/elements";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import {
  getCurrentUserProfile,
  getUserProfile,
  followUser,
  unfollowUser,
} from "../../api/userService";
import { blockUser } from "../../api/followService";
import { useThemeColors } from "../../hooks/useThemeColors";
import { UserProfile } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { subscribeOnlineStatus } from "../../utils/network";
import { useTrackTab } from "../../hooks/useTrackTab";
import { socialFeedApi, FeedPost } from "../../api/socialFeedApi";
import { FeedPostCard } from "../../components/FeedPostCard";
import { useNormalizeFeedPosts } from "../../context/LikesContext";
import { MINI_PLAYER_HEIGHT } from "../../components/WorkoutPlayer";
import { useSocialFeed } from "../../context/SocialFeedContext";
import { Avatar } from "../../components/Avatar";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { getPendingPosts, isPendingPostId } from "../../utils/pendingPosts";

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const GRID_ROWS = 5;
const GRID_COLS = 7;

// Shared pulse animation hook for all skeleton blocks on the screen.
function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

export function Profile() {
  const navigation = useNavigation() as any;
  const route = useRoute<any>();
  const colors = useThemeColors();

  const usernameParam: string | undefined = route.params?.username;
  const isOtherUser = !!usernameParam;

  useTrackTab(isOtherUser ? "UserProfile" : "Profile");

  const { user: authUser } = useAuth();
  // Seed the own-profile view with the cached auth user so the screen has
  // content immediately and stays usable while offline. The network fetch
  // below replaces it as soon as it lands. Other-user profiles aren't
  // cached client-side, so they fall through to the spinner as before.
  const [profile, setProfile] = useState<UserProfile | null>(
    isOtherUser ? null : (authUser ?? null),
  );
  const [loading, setLoading] = useState(isOtherUser ? true : authUser == null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const normalizeFeedPosts = useNormalizeFeedPosts();
  const { invalidate: invalidateFeed } = useSocialFeed();

  const t = {
    bg: colors.appBg,
    surface: colors.cardBg,
    text: colors.text,
    textMuted: colors.textMuted,
    textFaint: colors.textFaint,
    border: colors.cardBorder,
    primaryBg: colors.accent,
    primaryText: colors.accentText,
    skeleton: colors.skeleton,
    // Activity-heatmap intensity ramp — screen-specific, not a shared token.
    dotEmpty: colors.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    dotLow: colors.isDark ? "#4a2a12" : "#ffd2a8",
    dotMid: colors.isDark ? "#8a4716" : "#ff9d5c",
    dotHigh: colors.isDark ? "#ff6a1f" : "#e56a1f",
  };

  const loadProfile = async () => {
    try {
      setError(null);
      const profileData = usernameParam
        ? await getUserProfile(usernameParam)
        : await getCurrentUserProfile();
      setProfile(profileData);
      return profileData;
    } catch {
      setError("Failed to load profile");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile().then((profileData) => {
      if (profileData) {
        const fs =
          profileData.followStatus ??
          (profileData.isFollowing ? "ACCEPTED" : "NONE");
        const locked =
          profileData.isPrivate && fs !== "ACCEPTED" && isOtherUser;
        if (!locked) {
          loadUserPosts(profileData);
        }
      }
    });
  }, []);

  // Keep the own-profile view in sync with the auth-context user. When the
  // offline queue flushes and AuthContext re-fetches the profile, this picks
  // up the new totals without needing a manual reload.
  useEffect(() => {
    if (isOtherUser) return;
    if (authUser) setProfile(authUser);
  }, [authUser, isOtherUser]);

  // Refresh on reconnect so stale offline data is updated as soon as the
  // device comes back online.
  useEffect(() => {
    return subscribeOnlineStatus((online) => {
      if (!online) return;
      loadProfile().then((profileData) => {
        if (profileData) loadUserPosts(profileData);
      });
    });
    // loadProfile/loadUserPosts are stable closures captured at mount; we
    // intentionally don't re-subscribe each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-pull pending posts whenever the screen regains focus. Posting offline
  // from WorkoutComplete navigates back to this screen, so the synthesized
  // "in-progress" card needs to appear without a manual refresh.
  useFocusEffect(
    React.useCallback(() => {
      if (isOtherUser) return;
      if (profile) {
        loadUserPosts(profile);
      }
      // loadUserPosts is a closure captured at render — re-running it on
      // every focus is the intended behavior.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, isOtherUser]),
  );

  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;
    const status =
      profile.followStatus ?? (profile.isFollowing ? "ACCEPTED" : "NONE");

    if (status === "ACCEPTED") {
      Alert.alert(
        `Unfollow @${profile.username}?`,
        "Are you sure you want to unfollow this user?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unfollow",
            style: "destructive",
            onPress: async () => {
              setFollowLoading(true);
              // Optimistic update
              setProfile((prev) =>
                prev
                  ? { ...prev, followStatus: "NONE", isFollowing: false }
                  : prev,
              );
              try {
                await unfollowUser(profile.userId);
                invalidateFeed();
                loadProfile();
              } catch {
                setProfile((prev) =>
                  prev
                    ? { ...prev, followStatus: "ACCEPTED", isFollowing: true }
                    : prev,
                );
                Alert.alert("Error", "Failed to unfollow this user.");
              } finally {
                setFollowLoading(false);
              }
            },
          },
        ],
      );
    } else if (status === "PENDING") {
      setFollowLoading(true);
      setProfile((prev) => (prev ? { ...prev, followStatus: "NONE" } : prev));
      try {
        await unfollowUser(profile.userId);
        loadProfile();
      } catch {
        setProfile((prev) =>
          prev ? { ...prev, followStatus: "PENDING" } : prev,
        );
        Alert.alert("Error", "Failed to cancel follow request.");
      } finally {
        setFollowLoading(false);
      }
    } else {
      setFollowLoading(true);
      // Optimistic: show "Requested" immediately for private accounts
      const optimisticStatus = profile.isPrivate ? "PENDING" : "ACCEPTED";
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followStatus: optimisticStatus,
              isFollowing: optimisticStatus === "ACCEPTED",
            }
          : prev,
      );
      try {
        const response = await followUser(profile.userId);
        const confirmedStatus = response.status as UserProfile["followStatus"];
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followStatus: confirmedStatus,
                isFollowing: response.status === "ACCEPTED",
              }
            : prev,
        );
        if (response.status === "ACCEPTED") invalidateFeed();
        loadProfile();
      } catch {
        setProfile((prev) =>
          prev ? { ...prev, followStatus: "NONE", isFollowing: false } : prev,
        );
        Alert.alert("Error", "Failed to follow user.");
      } finally {
        setFollowLoading(false);
      }
    }
  };

  const handleProfileMenu = () => {
    if (!profile) return;
    Alert.alert(`@${profile.username}`, undefined, [
      {
        text: "Block User",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            `Block @${profile.username}?`,
            "They won't be able to see your posts or find your profile. You can unblock them later in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Block",
                style: "destructive",
                onPress: async () => {
                  try {
                    await blockUser(profile.userId);
                    navigation.goBack();
                  } catch {
                    Alert.alert("Error", "Failed to block this user.");
                  }
                },
              },
            ],
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const loadPendingForCurrentUser = async (
    targetProfile: UserProfile,
  ): Promise<FeedPost[]> => {
    if (isOtherUser) return [];
    if (!authUser || authUser.userId !== targetProfile.userId) return [];
    try {
      return await getPendingPosts(authUser);
    } catch (err) {
      console.error("Error loading pending posts:", err);
      return [];
    }
  };

  const loadUserPosts = async (profileData?: UserProfile) => {
    const targetProfile = profileData || profile;
    if (!targetProfile) return;
    try {
      setPostsLoading(true);
      // Server posts and offline pending posts can be fetched in parallel —
      // a pending post belongs only to the current user and never has a
      // real workoutId, so it can't collide with anything the API returns.
      const [response, pending] = await Promise.all([
        socialFeedApi.getUserPosts(targetProfile.userId, 0, 1).catch((err) => {
          console.error("Error loading user posts:", err);
          return null;
        }),
        loadPendingForCurrentUser(targetProfile),
      ]);
      const serverPosts = response?.content ?? [];
      normalizeFeedPosts(serverPosts);
      setPosts([...pending, ...serverPosts]);
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
    const followStatus =
      profile.followStatus ?? (profile.isFollowing ? "ACCEPTED" : "NONE");
    const isPrivateAndLocked =
      !!profile.isPrivate && followStatus !== "ACCEPTED" && isOtherUser;
    const followLabel =
      followStatus === "ACCEPTED"
        ? "Following"
        : followStatus === "PENDING"
          ? "Requested"
          : "Follow";
    const isFollowActive =
      followStatus === "ACCEPTED" || followStatus === "PENDING";

    const streak = profile.workoutStats?.workoutStreak ?? 0;

    const today = new Date();
    const todayDow = today.getDay();
    const todayIdx = (GRID_ROWS - 1) * GRID_COLS + todayDow;

    const activity =
      profile.workoutStats?.dailyActivity ??
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
            onPress={
              profile.profilePictureUrl
                ? () =>
                    navigation.navigate("ImageViewer", {
                      photos: [profile.profilePictureUrl!],
                      initialIndex: 0,
                    })
                : undefined
            }
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
          {!isOtherUser ? (
            <TouchableOpacity
              onPress={() => navigation.navigate("Settings")}
              hitSlop={10}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={34} color={t.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleProfileMenu}
              hitSlop={10}
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={t.text} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsWrap}>
          <View style={styles.statsRow}>
            <Stat
              theme={t}
              label="WORKOUTS"
              value={
                isPrivateAndLocked
                  ? "–"
                  : (profile.workoutStats?.totalWorkouts ?? 0)
              }
            />
            <TouchableOpacity
              style={styles.statCell}
              activeOpacity={isPrivateAndLocked ? 1 : 0.7}
              onPress={
                isPrivateAndLocked
                  ? undefined
                  : () =>
                      navigation.navigate("FollowScreen", {
                        initialTab: "followers",
                        userId: profile.userId,
                        username: profile.username,
                      })
              }
            >
              <Stat
                theme={t}
                label="FOLLOWERS"
                value={isPrivateAndLocked ? "–" : profile.followersCount}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={isPrivateAndLocked ? 1 : 0.7}
              onPress={
                isPrivateAndLocked
                  ? undefined
                  : () =>
                      navigation.navigate("FollowScreen", {
                        initialTab: "following",
                        userId: profile.userId,
                        username: profile.username,
                      })
              }
            >
              <Stat
                theme={t}
                label="FOLLOWING"
                value={isPrivateAndLocked ? "–" : profile.followingCount}
              />
            </TouchableOpacity>
          </View>

          {isOtherUser && (
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={followLoading}
              onPress={handleFollowToggle}
              style={[
                styles.followBtn,
                isFollowActive
                  ? {
                      backgroundColor: "transparent",
                      borderWidth: 1,
                      borderColor: t.border,
                    }
                  : { backgroundColor: t.primaryBg },
                followLoading && { opacity: 0.6 },
              ]}
            >
              <Text
                style={[
                  styles.followBtnText,
                  { color: isFollowActive ? t.text : t.primaryText },
                ]}
              >
                {followLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!isPrivateAndLocked && (
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
        )}

        {!isPrivateAndLocked && (
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
              <Text style={[styles.seeAllText, { color: t.text }]}>
                See all
              </Text>
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
        )}
      </View>
    );
  };

  if (error && !profile) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.text }}>Failed to load profile</Text>
        <Button onPress={loadProfile}>Retry</Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      {isOtherUser && (
        <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      )}
      <ScrollView
        contentContainerStyle={{
          paddingTop: isOtherUser ? 30 : 20,
          paddingBottom: MINI_PLAYER_HEIGHT + 30,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={t.text}
            onRefresh={async () => {
              setRefreshing(true);
              const profileData = await loadProfile();
              if (profileData) {
                await loadUserPosts(profileData);
              }
              setRefreshing(false);
            }}
          />
        }
      >
        {/* Call as a function (not <ProfileHeader />) so its output is inlined
            into this tree; rendering it as a nested component type would remount
            the subtree — and reset the Avatar's presigned-url state — on every
            Profile re-render. ProfileHeader uses no hooks, so this is safe. */}
        {profile ? ProfileHeader() : <ProfileHeaderSkeleton t={t} />}

        {profile ? (
          profile.isPrivate &&
          (profile.followStatus ??
            (profile.isFollowing ? "ACCEPTED" : "NONE")) !== "ACCEPTED" &&
          isOtherUser ? (
            <View style={styles.privateContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={48}
                color={t.textMuted}
              />
              <Text style={[styles.privateTitle, { color: t.text }]}>
                This Account is Private
              </Text>
              <Text style={[styles.privateSubtitle, { color: t.textMuted }]}>
                Follow this account to see their posts.
              </Text>
            </View>
          ) : posts.length > 0 ? (
            <FeedPostCard
              post={posts[0]}
              onOpenComments={handleOpenComments}
              isPending={isPendingPostId(posts[0].postId)}
            />
          ) : postsLoading ? (
            <PostCardSkeleton t={t} />
          ) : (
            <View style={styles.emptyPosts}>
              <Text style={[styles.emptyText, { color: t.textMuted }]}>
                No posts yet
              </Text>
            </View>
          )
        ) : (
          <PostCardSkeleton t={t} />
        )}
      </ScrollView>
    </SafeAreaView>
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

// ----- Skeletons -----

type SkeletonTheme = {
  bg: string;
  skeleton: string;
};

function SkeletonBlock({
  width,
  height,
  borderRadius = 4,
  style,
  t,
  opacity,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
  t: SkeletonTheme;
  opacity: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: t.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}

function ProfileHeaderSkeleton({ t }: { t: SkeletonTheme }) {
  const opacity = useSkeletonPulse();

  return (
    <View>
      <View style={styles.identityRow}>
        <SkeletonBlock
          width={96}
          height={96}
          borderRadius={48}
          t={t}
          opacity={opacity}
        />
        <View style={styles.identityText}>
          <SkeletonBlock
            width="70%"
            height={24}
            borderRadius={6}
            t={t}
            opacity={opacity}
          />
          <SkeletonBlock
            width="50%"
            height={14}
            borderRadius={4}
            style={{ marginTop: 8 }}
            t={t}
            opacity={opacity}
          />
        </View>
      </View>

      <View style={styles.statsWrap}>
        <View style={styles.statsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.statCell}>
              <SkeletonBlock
                width={64}
                height={10}
                borderRadius={3}
                t={t}
                opacity={opacity}
              />
              <SkeletonBlock
                width={48}
                height={28}
                borderRadius={6}
                style={{ marginTop: 8 }}
                t={t}
                opacity={opacity}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function PostCardSkeleton({ t }: { t: SkeletonTheme }) {
  const opacity = useSkeletonPulse();

  return (
    <View style={styles.postSkeletonWrap}>
      <View style={styles.postSkeletonHeader}>
        <SkeletonBlock
          width={36}
          height={36}
          borderRadius={18}
          t={t}
          opacity={opacity}
        />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <SkeletonBlock
            width="40%"
            height={12}
            borderRadius={3}
            t={t}
            opacity={opacity}
          />
          <SkeletonBlock
            width="25%"
            height={10}
            borderRadius={3}
            style={{ marginTop: 6 }}
            t={t}
            opacity={opacity}
          />
        </View>
      </View>
      <SkeletonBlock
        width="100%"
        height={200}
        borderRadius={12}
        style={{ marginTop: 12 }}
        t={t}
        opacity={opacity}
      />
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

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    height: 40,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
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

  privateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  privateTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  privateSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  loader: {
    padding: 32,
  },

  postSkeletonWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  postSkeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
});
