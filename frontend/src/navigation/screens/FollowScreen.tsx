import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Pressable,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getUserFollowers,
  getUserFollowing,
  followUser,
  unfollowUser,
} from "../../api/userService";
import { FollowerUser } from "../../api/types";
import { Avatar } from "../../components/Avatar";

type Tab = "followers" | "following";

export default function FollowScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const { initialTab = "followers", userId } = route.params ?? {};

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [following, setFollowing] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [followersData, followingData] = await Promise.all([
        getUserFollowers(userId),
        getUserFollowing(userId),
      ]);
      setFollowers(followersData);
      setFollowing(followingData);
    } catch (e) {
      console.error("Failed to load follow data", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFollowToggle = async (user: FollowerUser) => {
    setTogglingId(user.userId);
    try {
      if (user.isFollowing) {
        await unfollowUser(user.userId);
      } else {
        await followUser(user.userId);
      }
      // Update both lists optimistically
      const update = (list: FollowerUser[]) =>
        list.map((u) =>
          u.userId === user.userId ? { ...u, isFollowing: !u.isFollowing } : u,
        );
      setFollowers(update);
      setFollowing(update);
    } catch (e) {
      console.error("Failed to toggle follow", e);
    } finally {
      setTogglingId(null);
    }
  };

  const currentList = activeTab === "followers" ? followers : following;

  const renderItem = ({ item }: { item: FollowerUser }) => {
    const isToggling = togglingId === item.userId;
    return (
      <Pressable
        style={styles.userRow}
        onPress={() =>
          navigation.navigate(
            "Profile" as never,
            {
              username: item.username,
            } as never,
          )
        }
      >
        <Avatar
          username={item.username}
          profilePictureUrl={item.profilePictureUrl}
          size={48}
        />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>
            {item.displayName || item.username}
          </Text>
          <Text style={styles.handle}>@{item.username}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.followBtn,
            item.isFollowing ? styles.followingBtn : styles.notFollowingBtn,
          ]}
          onPress={() => handleFollowToggle(item)}
          disabled={isToggling}
        >
          {isToggling ? (
            <ActivityIndicator
              size="small"
              color={item.isFollowing ? "#000" : "#fff"}
            />
          ) : (
            <Text
              style={[
                styles.followBtnText,
                item.isFollowing
                  ? styles.followingBtnText
                  : styles.notFollowingBtnText,
              ]}
            >
              {item.isFollowing ? "Following" : "Follow"}
            </Text>
          )}
        </TouchableOpacity>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {route.params?.username ? `@${route.params.username}` : ""}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["followers", "following"] as Tab[]).map((tab) => {
          const count =
            tab === "followers" ? followers.length : following.length;
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[styles.tabCount, isActive && styles.tabCountActive]}
              >
                {loading ? "—" : count}
              </Text>
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          contentContainerStyle={
            currentList.length === 0 && styles.emptyContainer
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No {activeTab} yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#dbdbdb",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabCount: {
    fontSize: 17,
    fontWeight: "600",
    color: "#8e8e8e",
  },
  tabCountActive: {
    color: "#000",
  },
  tabLabel: {
    fontSize: 13,
    color: "#8e8e8e",
    marginTop: 2,
  },
  tabLabelActive: {
    color: "#000",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#000",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  handle: {
    fontSize: 13,
    color: "#8e8e8e",
    marginTop: 1,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  notFollowingBtn: {
    backgroundColor: "#0095f6",
  },
  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#dbdbdb",
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  notFollowingBtnText: {
    color: "#fff",
  },
  followingBtnText: {
    color: "#000",
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
    color: "#8e8e8e",
  },
});
