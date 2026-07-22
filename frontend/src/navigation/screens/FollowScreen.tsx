import React, { useCallback } from "react";
import { useRoute } from "@react-navigation/native";
import {
  getUserFollowers,
  getUserFollowing,
  getUserMutuals,
} from "../../api/userService";
import { UserListScreen, UserListTab } from "../../components/UserListScreen";
import { useTrackTab } from "../../hooks/useTrackTab";

type Tab = "followers" | "following" | "mutuals";

// Mutuals sits leftmost; the profile's stat cells still land on Followers /
// Following via initialTab, one swipe away from Mutuals.
const TABS: UserListTab[] = [
  // Mutuals: people the viewer follows who also follow this profile's owner
  // — on the viewer's own profile, their followbacks.
  { key: "mutuals", label: "Mutuals", emptyText: "No mutuals yet" },
  { key: "followers", label: "Followers", emptyText: "No followers yet" },
  { key: "following", label: "Following", emptyText: "No following yet" },
];

/**
 * A profile's connections: followers, following and mutuals tabs. Thin
 * wrapper over UserListScreen, which the gym lifters list shares.
 */
export default function FollowScreen() {
  const route = useRoute<any>();

  const {
    username,
    initialTab = "followers",
    userId,
  } = (route.params || {}) as {
    username?: string;
    initialTab?: Tab;
    userId?: string;
  };

  useTrackTab("FollowScreen");

  const loadLists = useCallback(async () => {
    if (!userId) {
      return { followers: [], following: [], mutuals: [] };
    }
    const [followers, following, mutuals] = await Promise.all([
      getUserFollowers(userId),
      getUserFollowing(userId),
      getUserMutuals(userId),
    ]);
    return { followers, following, mutuals };
  }, [userId]);

  return (
    <UserListScreen
      title={username ?? ""}
      tabs={TABS}
      initialTabKey={initialTab}
      loadLists={loadLists}
    />
  );
}
