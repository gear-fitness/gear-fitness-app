import React, { useCallback } from "react";
import { useRoute } from "@react-navigation/native";
import {
  getLocationLifters,
  getLocationLifterMutuals,
} from "../../api/locationService";
import { UserListScreen, UserListTab } from "../../components/UserListScreen";
import { useTrackTab } from "../../hooks/useTrackTab";

type Tab = "lifters" | "mutuals";

// Mutuals sits leftmost; the Lifters stat still lands on the Lifters tab via
// initialTab, one swipe away from Mutuals.
const TABS: UserListTab[] = [
  // The lifters the viewer follows — same rule as the location page's
  // "friends who train here" line.
  { key: "mutuals", label: "Mutuals", emptyText: "No mutuals yet" },
  // Everyone with at least one post at this gym the viewer can see.
  { key: "lifters", label: "Lifters", emptyText: "No lifters yet" },
];

/**
 * A gym's lifters list, opened from the location page's "Lifters" stat or
 * its "and N others train here" link. Same screen pattern as a profile's
 * follower lists, titled with the gym's name.
 */
export function LocationLifters() {
  const route = useRoute<any>();

  const {
    locationId,
    name,
    initialTab = "lifters",
  } = (route.params || {}) as {
    locationId: string;
    name?: string;
    initialTab?: Tab;
  };

  useTrackTab("LocationLifters");

  const loadLists = useCallback(async () => {
    const [lifters, mutuals] = await Promise.all([
      getLocationLifters(locationId),
      getLocationLifterMutuals(locationId),
    ]);
    return { lifters, mutuals };
  }, [locationId]);

  return (
    <UserListScreen
      title={name ?? ""}
      tabs={TABS}
      initialTabKey={initialTab}
      loadLists={loadLists}
    />
  );
}
