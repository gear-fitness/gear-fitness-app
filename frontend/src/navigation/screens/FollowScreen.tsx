import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  useColorScheme,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getUserFollowers,
  getUserFollowing,
  followUserByUsername,
  unfollowUser,
  getCurrentUserProfile,
} from "../../api/userService";
import { FollowerUser } from "../../api/types";
import { Avatar } from "../../components/Avatar";
import { useTrackTab } from "../../hooks/useTrackTab";

type Tab = "followers" | "following";

export default function FollowScreen() {
  const navigation = useNavigation() as any;
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    username,
    initialTab = "followers",
    userId,
  } = (route.params || {}) as {
    username?: string;
    initialTab?: Tab;
    userId?: string;
  };

  const c = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    secondary: isDark ? "#888" : "#8e8e8e",
    border: isDark ? "#222" : "#e0e0e0",
    separator: isDark ? "#111" : "#f2f2f2",
    rowPressed: isDark ? "#111" : "#f5f5f5",
    followBtn: "#0095f6",
    followBtnText: "#fff",
    followingBorder: isDark ? "#3a3a3a" : "#dbdbdb",
    followingText: isDark ? "#fff" : "#000",
    tabUnderline: isDark ? "#fff" : "#000",
    activeTab: isDark ? "#fff" : "#000",
    inactiveTab: isDark ? "#4a4a4a" : "#b0b0b0",
  };

  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [following, setFollowing] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const [followersData, followingData, currentProfile] = await Promise.all([
        getUserFollowers(userId),
        getUserFollowing(userId),
        getCurrentUserProfile(),
      ]);
      setFollowers(followersData);
      setFollowing(followingData);
      setCurrentUsername(currentProfile.username);
    } catch (e) {
      console.error("Failed to load follow data", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleFollowToggle = async (user: FollowerUser) => {
    if (!user.userId) return;

    try {
      setTogglingId(user.userId);

      if (user.isFollowing) {
        await unfollowUser(user.userId);
      } else {
        await followUserByUsername(user.username);
      }

      const flip = (list: FollowerUser[]) =>
        list.map((u) =>
          u.userId === user.userId ? { ...u, isFollowing: !u.isFollowing } : u,
        );

      setFollowers((prev) => flip(prev));
      setFollowing((prev) => flip(prev));
    } catch (e) {
      console.error("Failed to toggle follow", e);
      Alert.alert("Error", "Failed to update follow status");
    } finally {
      setTogglingId(null);
    }
  };

  const currentList = activeTab === "followers" ? followers : following;

  useTrackTab("FollowScreen");

  const renderItem = ({ item }: { item: FollowerUser }) => {
    const isToggling = togglingId === item.userId;
    const isCurrentUser = item.username === currentUsername;

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
          navigation.navigate("UserProfile", { username: item.username });
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
              item.isFollowing
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
                color={item.isFollowing ? c.followingText : c.followBtnText}
              />
            ) : (
              <Text
                style={[
                  styles.followBtnText,
                  {
                    color: item.isFollowing ? c.followingText : c.followBtnText,
                  },
                ]}
              >
                {item.isFollowing ? "Following" : "Follow"}
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: c.text }]}>
            {username ?? ""}
          </Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: c.border }]}>
        {(["followers", "following"] as Tab[]).map((tab) => {
          const count =
            tab === "followers" ? followers.length : following.length;
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => setActiveTab(tab)}
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
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.text} />
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          contentContainerStyle={
            currentList.length === 0 ? styles.emptyContainer : undefined
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: c.secondary }]}>
                No {activeTab} yet
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
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
  headerUsername: {
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: 0.1,
    marginBottom: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  tabsUsername: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
    paddingTop: 10,
    paddingBottom: 4,
    borderBottomWidth: 0,
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
  tabUsername: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 2,
    letterSpacing: 0.1,
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
