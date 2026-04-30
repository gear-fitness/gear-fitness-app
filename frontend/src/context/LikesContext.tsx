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

type LikeRecord = {
  serverLiked: boolean;
  serverCount: number;
  localDelta: 0 | 1 | -1;
};

type Records = Record<string, LikeRecord>;

type SeedInput = { serverLiked: boolean; serverCount: number };
type Fallback = { likedByCurrentUser: boolean; likeCount: number };

type LikesContextValue = {
  subscribe: (cb: () => void) => () => void;
  getRecord: (postId: string) => LikeRecord | undefined;
  ensureRecord: (postId: string, fallback: Fallback) => void;
  seedLikeState: (postId: string, server: SeedInput) => void;
  toggleLike: (postId: string) => void;
};

const LikesContext = createContext<LikesContextValue | null>(null);

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const recordsRef = useRef<Records>({});
  const subscribersRef = useRef<Set<() => void>>(new Set());
  const inFlightRef = useRef<Record<string, boolean>>({});

  const notify = useCallback(() => {
    subscribersRef.current.forEach((cb) => cb());
  }, []);

  const subscribe = useCallback((cb: () => void) => {
    subscribersRef.current.add(cb);
    return () => {
      subscribersRef.current.delete(cb);
    };
  }, []);

  const getRecord = useCallback(
    (postId: string) => recordsRef.current[postId],
    [],
  );

  const writeRecord = useCallback(
    (postId: string, record: LikeRecord) => {
      recordsRef.current = { ...recordsRef.current, [postId]: record };
      notify();
    },
    [notify],
  );

  const ensureRecord = useCallback(
    (postId: string, fallback: Fallback) => {
      if (recordsRef.current[postId]) return;
      writeRecord(postId, {
        serverLiked: fallback.likedByCurrentUser,
        serverCount: fallback.likeCount,
        localDelta: 0,
      });
    },
    [writeRecord],
  );

  const seedLikeState = useCallback(
    (postId: string, server: SeedInput) => {
      const existing = recordsRef.current[postId];
      // Phase 5 rule: if user has a pending action, ignore the seed entirely.
      if (existing && existing.localDelta !== 0) return;
      writeRecord(postId, {
        serverLiked: server.serverLiked,
        serverCount: server.serverCount,
        localDelta: 0,
      });
    },
    [writeRecord],
  );

  const processQueue = useCallback(
    async (postId: string) => {
      if (inFlightRef.current[postId]) return;

      // Safety bound: a healthy server should converge in <=2 iterations per
      // tap chain. Cap at 10 to defend against pathological loops.
      let iterations = 0;
      const MAX_ITERATIONS = 10;

      while (iterations++ < MAX_ITERATIONS) {
        const current = recordsRef.current[postId];
        if (!current || current.localDelta === 0) return;

        inFlightRef.current[postId] = true;
        try {
          const response = await socialFeedApi.toggleLike(postId);
          const after = recordsRef.current[postId];
          if (!after) {
            inFlightRef.current[postId] = false;
            return;
          }

          // User's intent at the moment the API resolved.
          const intent =
            after.localDelta !== 0 ? after.localDelta === 1 : after.serverLiked;

          // Reconcile: server values become truth. localDelta becomes whatever
          // is needed to keep the displayed state matching the user's intent.
          const newDelta: 0 | 1 | -1 =
            intent === response.liked ? 0 : intent ? 1 : -1;

          writeRecord(postId, {
            serverLiked: response.liked,
            serverCount: response.likeCount,
            localDelta: newDelta,
          });
        } catch (err) {
          console.error("toggleLike failed:", err);
          const after = recordsRef.current[postId];
          if (after) {
            writeRecord(postId, { ...after, localDelta: 0 });
          }
          inFlightRef.current[postId] = false;
          return;
        }
        inFlightRef.current[postId] = false;
        // Loop condition will exit if localDelta is now 0 (converged).
      }
    },
    [writeRecord],
  );

  const toggleLike = useCallback(
    (postId: string) => {
      const existing = recordsRef.current[postId];
      if (!existing) return;

      // Each tap either creates a delta against server (when delta=0) or
      // cancels an existing delta (returning to server state).
      const newDelta: 0 | 1 | -1 =
        existing.localDelta === 0 ? (existing.serverLiked ? -1 : 1) : 0;

      writeRecord(postId, { ...existing, localDelta: newDelta });
      void processQueue(postId);
    },
    [processQueue, writeRecord],
  );

  const value = useMemo<LikesContextValue>(
    () => ({
      subscribe,
      getRecord,
      ensureRecord,
      seedLikeState,
      toggleLike,
    }),
    [subscribe, getRecord, ensureRecord, seedLikeState, toggleLike],
  );

  return (
    <LikesContext.Provider value={value}>{children}</LikesContext.Provider>
  );
}

function useLikesContext(): LikesContextValue {
  const ctx = useContext(LikesContext);
  if (!ctx) {
    throw new Error("useLikesContext must be used within a LikesProvider");
  }
  return ctx;
}

export function useLikeState(
  postId: string,
  fallback?: Fallback,
): { liked: boolean; count: number; toggle: () => void } {
  const ctx = useLikesContext();

  // Seed the record on first read so the very first paint is correct.
  useEffect(() => {
    if (fallback) ctx.ensureRecord(postId, fallback);
  }, [ctx, postId, fallback?.likedByCurrentUser, fallback?.likeCount]);

  const record = useSyncExternalStore(ctx.subscribe, () =>
    ctx.getRecord(postId),
  );

  const serverLiked =
    record?.serverLiked ?? fallback?.likedByCurrentUser ?? false;
  const serverCount = record?.serverCount ?? fallback?.likeCount ?? 0;
  const localDelta = record?.localDelta ?? 0;

  const liked = localDelta !== 0 ? localDelta === 1 : serverLiked;
  const count = serverCount + localDelta;

  const toggle = useCallback(() => ctx.toggleLike(postId), [ctx, postId]);

  return { liked, count, toggle };
}

export function useNormalizeFeedPosts() {
  const { seedLikeState } = useLikesContext();
  return useCallback(
    (posts: FeedPost[]) => {
      posts.forEach((p) =>
        seedLikeState(p.postId, {
          serverLiked: p.likedByCurrentUser,
          serverCount: p.likeCount,
        }),
      );
    },
    [seedLikeState],
  );
}

export function useSeedLikeState() {
  const { seedLikeState } = useLikesContext();
  return seedLikeState;
}
