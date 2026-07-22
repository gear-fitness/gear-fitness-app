import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  useColorScheme,
} from "react-native";
import PagerView, {
  PagerViewOnPageSelectedEvent,
} from "react-native-pager-view";
import { Text } from "./Text";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  followUserByUsername,
  unfollowUser,
  getCurrentUserProfile,
} from "../api/userService";
import { FollowerUser } from "../api/types";
import { Avatar } from "./Avatar";
import { FloatingCloseButton } from "./FloatingCloseButton";
import { useFollowStatus } from "../context/FollowStatusContext";

export interface UserListTab {
  key: string;
  label: string;
  emptyText: string;
}

interface UserListScreenProps {
  /** Header title — a username for follow lists, a gym name for lifters. */
  title: string;
  tabs: UserListTab[];
  initialTabKey?: string;
  /**
   * Fetch every tab's rows in one go, keyed by tab key. Called on mount, so
   * follow changes made elsewhere are picked up each time the screen opens.
   */
  loadLists: () => Promise<Record<string, FollowerUser[]>>;
}

/**
 * The shared tabbed people-list screen: mutuals/followers/following on a
 * profile, mutuals/lifters on a gym. One implementation so rows, tab counts,
 * empty states and follow buttons behave identically everywhere. Tabs are
 * pages of a horizontal pager, so swiping moves between them; the native
 * stack's screen-edge gesture outranks the pager's scroll, so a swipe from
 * the very left edge still pops back to the previous screen.
 */
export function UserListScreen({
  title,
  tabs,
  initialTabKey,
  loadLists,
}: UserListScreenProps) {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const c = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    secondary: isDark ? "#888" : "#8e8e8e",
    border: isDark ? "#222" : "#e0e0e0",
    separator: isDark ? "#111" : "#f2f2f2",
    rowPressed: isDark ? "#111" : "#f5f5f5",
    followBtn: "#3a3a3a",
    followBtnText: "#fff",
    followingBorder: isDark ? "#3a3a3a" : "#dbdbdb",
    followingText: isDark ? "#fff" : "#000",
    tabUnderline: isDark ? "#fff" : "#000",
    activeTab: isDark ? "#fff" : "#000",
    inactiveTab: isDark ? "#4a4a4a" : "#b0b0b0",
  };

  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState<number>(
    Math.max(
      0,
      tabs.findIndex((tab) => tab.key === initialTabKey),
    ),
  );
  const [lists, setLists] = useState<Record<string, FollowerUser[]>>({});
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const pagerRef = useRef<PagerView>(null);

  // Shared follow-status overrides. Lets a follow/unfollow done on a user's
  // profile (after tapping into it from this list) flip their row's button here
  // without reloading the whole list.
  const { overrides, setFollowStatus: publishFollowStatus } = useFollowStatus();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, currentProfile] = await Promise.all([
        loadLists(),
        getCurrentUserProfile(),
      ]);
      setLists(listData);
      setCurrentUsername(currentProfile.username);
    } catch (e) {
      console.error("Failed to load user lists", e);
    } finally {
      setLoading(false);
    }
  }, [loadLists]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFollowToggle = async (user: FollowerUser) => {
    if (!user.userId) return;

    // Match the action to what the row actually shows (override wins).
    const status =
      overrides[user.userId] ??
      user.followStatus ??
      (user.isFollowing ? "ACCEPTED" : "NONE");

    const setStatus = (newStatus: "ACCEPTED" | "PENDING" | "NONE") => {
      setLists((prev) => {
        const next: Record<string, FollowerUser[]> = {};
        for (const key of Object.keys(prev)) {
          next[key] = prev[key].map((u) =>
            u.userId === user.userId
              ? {
                  ...u,
                  followStatus: newStatus,
                  isFollowing: newStatus === "ACCEPTED",
                }
              : u,
          );
        }
        return next;
      });
      publishFollowStatus(user.userId, newStatus);
    };

    try {
      setTogglingId(user.userId);

      if (status === "ACCEPTED" || status === "PENDING") {
        // Following → unfollow; Requested → cancel the pending request
        await unfollowUser(user.userId);
        setStatus("NONE");
      } else {
        // Private accounts return PENDING (Requested), public return ACCEPTED
        const response = await followUserByUsername(user.username);
        setStatus(response.status === "ACCEPTED" ? "ACCEPTED" : "PENDING");
      }
    } catch (e) {
      console.error("Failed to toggle follow", e);
      Alert.alert("Error", "Failed to update follow status");
    } finally {
      setTogglingId(null);
    }
  };

  const renderItem = ({ item }: { item: FollowerUser }) => {
    const isToggling = togglingId === item.userId;
    const isCurrentUser = item.username === currentUsername;
    // A shared override (set when the user toggled follow on this person's
    // profile or elsewhere) wins over the status the list was loaded with.
    const status =
      overrides[item.userId] ??
      item.followStatus ??
      (item.isFollowing ? "ACCEPTED" : "NONE");
    // "Following" and "Requested" share the same outlined treatment
    const isFollowActive = status === "ACCEPTED" || status === "PENDING";
    const followLabel =
      status === "ACCEPTED"
        ? "Following"
        : status === "PENDING"
          ? "Requested"
          : "Follow";

    return (
      <Pressable
        style={({ pressed }) => [
          styles.userRow,
          {
            backgroundColor: pressed && !isCurrentUser ? c.rowPressed : c.bg,
            borderBottomColor: c.separator,
          },
        ]}
        disabled={isCurrentUser}
        onPress={() => {
          if (isCurrentUser) return;
          // push (not navigate) so tapping a user from a list stacks a fresh
          // profile on top instead of popping back to an existing UserProfile
          // in the stack — which would tear this screen (and its scroll
          // position) out from underneath.
          navigation.push("UserProfile", { username: item.username });
        }}
      >
        <Avatar
          username={item.username}
          profilePictureUrl={item.profilePictureUrl}
          size={46}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.displayName, { color: c.text }]}>
            {item.displayName || item.username}
          </Text>
          <Text style={[styles.handle, { color: c.secondary }]}>
            @{item.username}
          </Text>
        </View>

        {!isCurrentUser && (
          <TouchableOpacity
            style={[
              styles.followBtn,
              isFollowActive
                ? [styles.followingBtn, { borderColor: c.followingBorder }]
                : [styles.notFollowingBtn, { backgroundColor: c.followBtn }],
            ]}
            onPress={() => handleFollowToggle(item)}
            disabled={isToggling}
            activeOpacity={0.75}
          >
            {isToggling ? (
              <ActivityIndicator
                size="small"
                color={isFollowActive ? c.followingText : c.followBtnText}
              />
            ) : (
              <Text
                style={[
                  styles.followBtnText,
                  {
                    color: isFollowActive ? c.followingText : c.followBtnText,
                  },
                ]}
              >
                {followLabel}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </Pressable>
    );
  };
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.bg, paddingTop: insets.top },
      ]}
    >
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <View style={styles.backBtn} />

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: c.text }]}>{title}</Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: c.border }]}>
        {tabs.map((tab, index) => {
          const count = (lists[tab.key] ?? []).length;
          const isActive = activeIndex === index;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => {
                // Flip the underline immediately; the pager animates over.
                // (While still loading the pager isn't mounted yet — it then
                // mounts with initialPage set to this index.)
                setActiveIndex(index);
                pagerRef.current?.setPage(index);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabCount,
                  { color: isActive ? c.activeTab : c.inactiveTab },
                ]}
              >
                {loading ? "—" : count}
              </Text>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? c.activeTab : c.inactiveTab },
                ]}
              >
                {tab.label}
              </Text>

              {isActive && (
                <View
                  style={[
                    styles.tabUnderline,
                    { backgroundColor: c.tabUnderline },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* One page per tab; horizontal swipes move between them. */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.text} />
        </View>
      ) : (
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={activeIndex}
          onPageSelected={(e: PagerViewOnPageSelectedEvent) =>
            setActiveIndex(e.nativeEvent.position)
          }
        >
          {tabs.map((tab) => {
            const list = lists[tab.key] ?? [];
            return (
              <View key={tab.key} style={styles.page}>
                <FlatList
                  data={list}
                  keyExtractor={(item) => item.userId}
                  renderItem={renderItem}
                  contentContainerStyle={
                    list.length === 0 ? styles.emptyContainer : undefined
                  }
                  ListEmptyComponent={
                    <View style={styles.center}>
                      <Text style={[styles.emptyText, { color: c.secondary }]}>
                        {tab.emptyText}
                      </Text>
                    </View>
                  }
                  showsVerticalScrollIndicator={false}
                />
              </View>
            );
          })}
        </PagerView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabCount: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    borderRadius: 1,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  handle: {
    fontSize: 13,
    fontWeight: "400",
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  notFollowingBtn: {},
  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "400",
  },
});
