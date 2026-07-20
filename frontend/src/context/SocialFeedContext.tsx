import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { FeedPost, Page, socialFeedApi } from "../api/socialFeedApi";
import { useNormalizeFeedPosts } from "./LikesContext";
import { useAuth } from "./AuthContext";

const PAGE_SIZE = 5;

/**
 * Identifies an independent feed. Each key owns its own state, pagination,
 * scroll position, and staleness. "following" and "discover" exist today;
 * "group:<id>" is reserved for the planned Groups feature so adding a group
 * feed is just a new key, not a rewrite.
 */
export type FeedKey = "following" | "discover" | `group:${string}`;

type Status = "idle" | "loading" | "ready" | "error";

type FeedState = {
  posts: FeedPost[];
  status: Status;
  refreshing: boolean;
  loadingMore: boolean;
  currentPage: number;
  hasMore: boolean;
  error: string | null;
  isStale: boolean;
};

const INITIAL_STATE: FeedState = {
  posts: [],
  status: "idle",
  refreshing: false,
  loadingMore: false,
  currentPage: 0,
  hasMore: true,
  error: null,
  isStale: false,
};

type FeedEntry = {
  state: FeedState;
  scrollOffset: number;
  generation: number;
};

/**
 * Maps a feed key to the function that fetches one page of it. Groups will
 * slot in here once their endpoint exists.
 */
function fetcherFor(
  key: FeedKey,
): (page: number, size: number) => Promise<Page<FeedPost>> {
  if (key === "discover") return socialFeedApi.getDiscoverFeed;
  return socialFeedApi.getFeed; // "following" (and the default)
}

type SocialFeedContextValue = {
  subscribe: (key: FeedKey, cb: () => void) => () => void;
  getSnapshot: (key: FeedKey) => FeedState;
  initialLoadIfNeeded: (key: FeedKey) => void;
  refresh: (key: FeedKey) => Promise<void>;
  loadMore: (key: FeedKey) => Promise<void>;
  invalidate: (key: FeedKey) => void;
  invalidateAll: () => void;
  refreshIfStaleAndHidden: (key: FeedKey) => void;
  getScrollOffset: (key: FeedKey) => number;
  setScrollOffset: (key: FeedKey, offset: number) => void;
  clear: () => void;
};

const SocialFeedContext = createContext<SocialFeedContextValue | null>(null);

export function SocialFeedProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // One entry per feed key. Kept in a ref (not React state) and mutated in
  // place; entry.state is replaced immutably so useSyncExternalStore sees a
  // stable reference between notifications.
  const feedsRef = useRef<Map<FeedKey, FeedEntry>>(new Map());
  const subscribersRef = useRef<Map<FeedKey, Set<() => void>>>(new Map());

  const { user } = useAuth();
  const normalizeFeedPosts = useNormalizeFeedPosts();

  // Lazily create (once) and return the entry for a key. Reads must NOT
  // allocate a new state object, or getSnapshot would loop.
  const ensure = useCallback((key: FeedKey): FeedEntry => {
    let entry = feedsRef.current.get(key);
    if (!entry) {
      entry = { state: INITIAL_STATE, scrollOffset: 0, generation: 0 };
      feedsRef.current.set(key, entry);
    }
    return entry;
  }, []);

  const notify = useCallback((key: FeedKey) => {
    subscribersRef.current.get(key)?.forEach((cb) => cb());
  }, []);

  const subscribe = useCallback((key: FeedKey, cb: () => void) => {
    let set = subscribersRef.current.get(key);
    if (!set) {
      set = new Set();
      subscribersRef.current.set(key, set);
    }
    set.add(cb);
    return () => {
      subscribersRef.current.get(key)?.delete(cb);
    };
  }, []);

  const getSnapshot = useCallback(
    (key: FeedKey) => ensure(key).state,
    [ensure],
  );

  const setState = useCallback(
    (key: FeedKey, updater: (prev: FeedState) => FeedState) => {
      const entry = ensure(key);
      entry.state = updater(entry.state);
      notify(key);
    },
    [ensure, notify],
  );

  const refresh = useCallback(
    async (key: FeedKey) => {
      const entry = ensure(key);
      const generation = ++entry.generation;
      setState(key, (prev) => ({ ...prev, refreshing: true, error: null }));
      try {
        const response = await fetcherFor(key)(0, PAGE_SIZE);
        if (entry.generation !== generation) return;
        normalizeFeedPosts(response.content);
        entry.scrollOffset = 0;
        setState(key, (prev) => ({
          ...prev,
          posts: response.content,
          status: "ready",
          refreshing: false,
          currentPage: 0,
          hasMore: !response.last,
          error: null,
          isStale: false,
        }));
      } catch (err: any) {
        if (entry.generation !== generation) return;
        console.error("Error refreshing feed:", err);
        setState(key, (prev) => ({
          ...prev,
          refreshing: false,
          error: err?.message ?? "Failed to refresh feed",
        }));
      }
    },
    [ensure, normalizeFeedPosts, setState],
  );

  const initialLoadIfNeeded = useCallback(
    (key: FeedKey) => {
      const entry = ensure(key);
      if (entry.state.status !== "idle") return;
      const generation = ++entry.generation;
      setState(key, (prev) => ({ ...prev, status: "loading", error: null }));
      (async () => {
        try {
          const response = await fetcherFor(key)(0, PAGE_SIZE);
          if (entry.generation !== generation) return;
          normalizeFeedPosts(response.content);
          setState(key, (prev) => ({
            ...prev,
            posts: response.content,
            status: "ready",
            currentPage: 0,
            hasMore: !response.last,
            error: null,
            isStale: false,
          }));
        } catch (err: any) {
          if (entry.generation !== generation) return;
          console.error("Error loading feed:", err);
          setState(key, (prev) => ({
            ...prev,
            status: "error",
            error: err?.message ?? "Failed to load feed",
          }));
        }
      })();
    },
    [ensure, normalizeFeedPosts, setState],
  );

  const loadMore = useCallback(
    async (key: FeedKey) => {
      const entry = ensure(key);
      const s = entry.state;
      if (
        !s.hasMore ||
        s.loadingMore ||
        s.status === "loading" ||
        s.refreshing
      ) {
        return;
      }

      const nextPage = s.currentPage + 1;
      // Capture current generation; if invalidate/refresh bumps it before we
      // resolve, we drop the response to avoid appending to a stale post list.
      const generation = entry.generation;
      setState(key, (prev) => ({ ...prev, loadingMore: true }));
      try {
        const response = await fetcherFor(key)(nextPage, PAGE_SIZE);
        if (entry.generation !== generation) {
          setState(key, (prev) => ({ ...prev, loadingMore: false }));
          return;
        }
        normalizeFeedPosts(response.content);
        setState(key, (prev) => ({
          ...prev,
          posts: [...prev.posts, ...response.content],
          currentPage: nextPage,
          hasMore: !response.last,
          loadingMore: false,
        }));
      } catch (err: any) {
        console.error("Error loading more posts:", err);
        setState(key, (prev) => ({ ...prev, loadingMore: false }));
      }
    },
    [ensure, normalizeFeedPosts, setState],
  );

  const invalidate = useCallback(
    (key: FeedKey) => {
      setState(key, (prev) => ({ ...prev, isStale: true }));
    },
    [setState],
  );

  // Mark every live feed stale. Used after an action that can affect more than
  // one feed (new post, follow/unfollow, block, visibility change).
  const invalidateAll = useCallback(() => {
    feedsRef.current.forEach((entry, key) => {
      entry.state = { ...entry.state, isStale: true };
      notify(key);
    });
  }, [notify]);

  const refreshIfStaleAndHidden = useCallback(
    (key: FeedKey) => {
      const s = ensure(key).state;
      if (!s.isStale) return;
      if (s.status === "loading" || s.refreshing) return;
      void refresh(key);
    },
    [ensure, refresh],
  );

  const getScrollOffset = useCallback(
    (key: FeedKey) => ensure(key).scrollOffset,
    [ensure],
  );

  const setScrollOffset = useCallback(
    (key: FeedKey, offset: number) => {
      ensure(key).scrollOffset = offset;
    },
    [ensure],
  );

  const clear = useCallback(() => {
    // Wipe every feed: bump generations so in-flight fetches drop, reset state
    // and scroll, and notify so mounted lists re-render to the empty state.
    feedsRef.current.forEach((entry, key) => {
      entry.generation++;
      entry.state = INITIAL_STATE;
      entry.scrollOffset = 0;
      notify(key);
    });
  }, [notify]);

  const prevUserIdRef = useRef(user?.userId ?? null);
  useEffect(() => {
    const prev = prevUserIdRef.current;
    const curr = user?.userId ?? null;
    if (prev !== curr) {
      // Logout, login as different user, or first login — wipe any prior data.
      clear();
      prevUserIdRef.current = curr;
    }
  }, [user, clear]);

  const value = useMemo<SocialFeedContextValue>(
    () => ({
      subscribe,
      getSnapshot,
      initialLoadIfNeeded,
      refresh,
      loadMore,
      invalidate,
      invalidateAll,
      refreshIfStaleAndHidden,
      getScrollOffset,
      setScrollOffset,
      clear,
    }),
    [
      subscribe,
      getSnapshot,
      initialLoadIfNeeded,
      refresh,
      loadMore,
      invalidate,
      invalidateAll,
      refreshIfStaleAndHidden,
      getScrollOffset,
      setScrollOffset,
      clear,
    ],
  );

  return (
    <SocialFeedContext.Provider value={value}>
      {children}
    </SocialFeedContext.Provider>
  );
}

function useSocialFeedContext(): SocialFeedContextValue {
  const ctx = useContext(SocialFeedContext);
  if (!ctx) {
    throw new Error("useSocialFeed must be used within a SocialFeedProvider");
  }
  return ctx;
}

/**
 * Consume a single feed by key. Returns the same shape regardless of key, so
 * callers (and FeedPostCard) are agnostic to which feed they render. Defaults
 * to "following" so existing call sites keep working unchanged.
 */
export function useSocialFeed(feedKey: FeedKey = "following") {
  const ctx = useSocialFeedContext();

  // subscribe/getSnapshot MUST be memoized on feedKey, or useSyncExternalStore
  // re-subscribes every render.
  const subscribe = useCallback(
    (cb: () => void) => ctx.subscribe(feedKey, cb),
    [ctx, feedKey],
  );
  const getSnapshot = useCallback(
    () => ctx.getSnapshot(feedKey),
    [ctx, feedKey],
  );
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const initialLoadIfNeeded = useCallback(
    () => ctx.initialLoadIfNeeded(feedKey),
    [ctx, feedKey],
  );
  const refresh = useCallback(() => ctx.refresh(feedKey), [ctx, feedKey]);
  const loadMore = useCallback(() => ctx.loadMore(feedKey), [ctx, feedKey]);
  const invalidate = useCallback(() => ctx.invalidate(feedKey), [ctx, feedKey]);
  const refreshIfStaleAndHidden = useCallback(
    () => ctx.refreshIfStaleAndHidden(feedKey),
    [ctx, feedKey],
  );
  const getScrollOffset = useCallback(
    () => ctx.getScrollOffset(feedKey),
    [ctx, feedKey],
  );
  const setScrollOffset = useCallback(
    (offset: number) => ctx.setScrollOffset(feedKey, offset),
    [ctx, feedKey],
  );

  // Memoized so the returned object keeps a stable identity across renders.
  // Consumers pass this straight down as a prop (Social's FeedList), and a fresh
  // literal here would change that prop's identity on every render, defeating
  // React.memo on the list and its cards.
  return useMemo(
    () => ({
      posts: state.posts,
      status: state.status,
      refreshing: state.refreshing,
      loadingMore: state.loadingMore,
      hasMore: state.hasMore,
      error: state.error,
      isStale: state.isStale,
      initialLoadIfNeeded,
      refresh,
      loadMore,
      invalidate,
      invalidateAll: ctx.invalidateAll,
      refreshIfStaleAndHidden,
      getScrollOffset,
      setScrollOffset,
      clear: ctx.clear,
    }),
    [
      state,
      initialLoadIfNeeded,
      refresh,
      loadMore,
      invalidate,
      ctx.invalidateAll,
      refreshIfStaleAndHidden,
      getScrollOffset,
      setScrollOffset,
      ctx.clear,
    ],
  );
}
