import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { FeedPost, socialFeedApi } from "../api/socialFeedApi";
import { useNormalizeFeedPosts } from "./LikesContext";
import { useAuth } from "./AuthContext";

const PAGE_SIZE = 5;

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

type SocialFeedContextValue = {
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => FeedState;
  initialLoadIfNeeded: () => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  invalidate: () => void;
  refreshIfStaleAndHidden: () => void;
  getScrollOffset: () => number;
  setScrollOffset: (offset: number) => void;
  clear: () => void;
};

const SocialFeedContext = createContext<SocialFeedContextValue | null>(null);

export function SocialFeedProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const stateRef = useRef<FeedState>(INITIAL_STATE);
  const subscribersRef = useRef<Set<() => void>>(new Set());
  const fetchGenerationRef = useRef(0);
  const scrollOffsetRef = useRef(0);

  const { user } = useAuth();
  const normalizeFeedPosts = useNormalizeFeedPosts();

  const notify = useCallback(() => {
    subscribersRef.current.forEach((cb) => cb());
  }, []);

  const subscribe = useCallback((cb: () => void) => {
    subscribersRef.current.add(cb);
    return () => {
      subscribersRef.current.delete(cb);
    };
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  const setState = useCallback(
    (updater: (prev: FeedState) => FeedState) => {
      stateRef.current = updater(stateRef.current);
      notify();
    },
    [notify],
  );

  const refresh = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    setState((prev) => ({ ...prev, refreshing: true, error: null }));
    try {
      const response = await socialFeedApi.getFeed(0, PAGE_SIZE);
      if (fetchGenerationRef.current !== generation) return;
      normalizeFeedPosts(response.content);
      scrollOffsetRef.current = 0;
      setState((prev) => ({
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
      if (fetchGenerationRef.current !== generation) return;
      console.error("Error refreshing feed:", err);
      setState((prev) => ({
        ...prev,
        refreshing: false,
        error: err?.message ?? "Failed to refresh feed",
      }));
    }
  }, [normalizeFeedPosts, setState]);

  const initialLoadIfNeeded = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== "idle") return;
    const generation = ++fetchGenerationRef.current;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    (async () => {
      try {
        const response = await socialFeedApi.getFeed(0, PAGE_SIZE);
        if (fetchGenerationRef.current !== generation) return;
        normalizeFeedPosts(response.content);
        setState((prev) => ({
          ...prev,
          posts: response.content,
          status: "ready",
          currentPage: 0,
          hasMore: !response.last,
          error: null,
          isStale: false,
        }));
      } catch (err: any) {
        if (fetchGenerationRef.current !== generation) return;
        console.error("Error loading feed:", err);
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err?.message ?? "Failed to load feed",
        }));
      }
    })();
  }, [normalizeFeedPosts, setState]);

  const loadMore = useCallback(async () => {
    const s = stateRef.current;
    if (!s.hasMore || s.loadingMore || s.status === "loading" || s.refreshing) {
      return;
    }

    const nextPage = s.currentPage + 1;
    // Capture current generation; if invalidate/refresh bumps it before we resolve,
    // we drop the response to avoid appending to a stale post list.
    const generation = fetchGenerationRef.current;
    setState((prev) => ({ ...prev, loadingMore: true }));
    try {
      const response = await socialFeedApi.getFeed(nextPage, PAGE_SIZE);
      if (fetchGenerationRef.current !== generation) {
        setState((prev) => ({ ...prev, loadingMore: false }));
        return;
      }
      normalizeFeedPosts(response.content);
      setState((prev) => ({
        ...prev,
        posts: [...prev.posts, ...response.content],
        currentPage: nextPage,
        hasMore: !response.last,
        loadingMore: false,
      }));
    } catch (err: any) {
      console.error("Error loading more posts:", err);
      setState((prev) => ({ ...prev, loadingMore: false }));
    }
  }, [normalizeFeedPosts, setState]);

  const invalidate = useCallback(() => {
    setState((prev) => ({ ...prev, isStale: true }));
  }, [setState]);

  const refreshIfStaleAndHidden = useCallback(() => {
    const s = stateRef.current;
    if (!s.isStale) return;
    if (s.status === "loading" || s.refreshing) return;
    void refresh();
  }, [refresh]);

  const getScrollOffset = useCallback(() => scrollOffsetRef.current, []);

  const setScrollOffset = useCallback((offset: number) => {
    scrollOffsetRef.current = offset;
  }, []);

  const clear = useCallback(() => {
    fetchGenerationRef.current++;
    scrollOffsetRef.current = 0;
    stateRef.current = INITIAL_STATE;
    notify();
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

export function useSocialFeed() {
  const ctx = useSocialFeedContext();
  const state = useSyncExternalStore(ctx.subscribe, ctx.getSnapshot);
  return {
    posts: state.posts,
    status: state.status,
    refreshing: state.refreshing,
    loadingMore: state.loadingMore,
    hasMore: state.hasMore,
    error: state.error,
    isStale: state.isStale,
    initialLoadIfNeeded: ctx.initialLoadIfNeeded,
    refresh: ctx.refresh,
    loadMore: ctx.loadMore,
    invalidate: ctx.invalidate,
    refreshIfStaleAndHidden: ctx.refreshIfStaleAndHidden,
    getScrollOffset: ctx.getScrollOffset,
    setScrollOffset: ctx.setScrollOffset,
    clear: ctx.clear,
  };
}
