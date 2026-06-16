import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type FollowStatus = "ACCEPTED" | "PENDING" | "BLOCKED" | "NONE";

/**
 * Session-scoped source of truth for the *current* user's follow relationship
 * toward other users, keyed by the other user's id. Any screen that changes a
 * follow status (a profile, a follower/following list) writes here; any screen
 * that displays a follow button overlays this map on top of whatever the server
 * last returned. This keeps the buttons in sync across screens without forcing a
 * full reload — e.g. unfollowing from a profile flips the row's button back to
 * "Follow" in the follower/following list you came from.
 */
type FollowStatusContextValue = {
  overrides: Record<string, FollowStatus>;
  setFollowStatus: (userId: string, status: FollowStatus) => void;
};

const FollowStatusContext = createContext<FollowStatusContextValue | null>(
  null,
);

export function FollowStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [overrides, setOverrides] = useState<Record<string, FollowStatus>>({});

  const setFollowStatus = useCallback(
    (userId: string, status: FollowStatus) => {
      if (!userId) return;
      setOverrides((prev) =>
        prev[userId] === status ? prev : { ...prev, [userId]: status },
      );
    },
    [],
  );

  const value = useMemo(
    () => ({ overrides, setFollowStatus }),
    [overrides, setFollowStatus],
  );

  return (
    <FollowStatusContext.Provider value={value}>
      {children}
    </FollowStatusContext.Provider>
  );
}

export function useFollowStatus(): FollowStatusContextValue {
  const ctx = useContext(FollowStatusContext);
  if (!ctx) {
    throw new Error(
      "useFollowStatus must be used within a FollowStatusProvider",
    );
  }
  return ctx;
}
