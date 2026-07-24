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
  /** Desired state while one or more toggle requests converge; null at rest. */
  intent: boolean | null;
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
  setLiked: (postId: string, liked: boolean) => void;
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
        intent: null,
      });
    },
    [writeRecord],
  );

  const seedLikeState = useCallback(
    (postId: string, server: SeedInput) => {
      const existing = recordsRef.current[postId];
      // A feed refresh must not overwrite intent while a request is converging.
      if (existing && existing.intent !== null) return;
      writeRecord(postId, {
        serverLiked: server.serverLiked,
        serverCount: server.serverCount,
        intent: null,
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
        if (!current || current.intent === null) return;

        // Intent may return to the known server state while no request is in
        // flight. Clear it without issuing a redundant toggle.
        if (current.intent === current.serverLiked) {
          writeRecord(postId, { ...current, intent: null });
          return;
        }

        inFlightRef.current[postId] = true;
        try {
          const response = await socialFeedApi.toggleLike(postId);
          const after = recordsRef.current[postId];
          if (!after) {
            inFlightRef.current[postId] = false;
            return;
          }

          // Preserve the latest intent, including a reversal made while this
          // request was in flight, and keep toggling until the server matches.
          const intent = after.intent ?? after.serverLiked;

          writeRecord(postId, {
            serverLiked: response.liked,
            serverCount: response.likeCount,
            intent: intent === response.liked ? null : intent,
          });
        } catch (err) {
          console.error("toggleLike failed:", err);
          const after = recordsRef.current[postId];
          if (after) {
            writeRecord(postId, { ...after, intent: null });
          }
          inFlightRef.current[postId] = false;
          return;
        }
        inFlightRef.current[postId] = false;
        // Loop condition exits once intent is null (converged).
      }
    },
    [writeRecord],
  );

  const toggleLike = useCallback(
    (postId: string) => {
      const existing = recordsRef.current[postId];
      if (!existing) return;

      const currentLiked = existing.intent ?? existing.serverLiked;
      writeRecord(postId, { ...existing, intent: !currentLiked });
      void processQueue(postId);
    },
    [processQueue, writeRecord],
  );

  const setLiked = useCallback(
    (postId: string, liked: boolean) => {
      const existing = recordsRef.current[postId];
      if (!existing) return;

      const currentLiked = existing.intent ?? existing.serverLiked;
      if (currentLiked === liked) return;

      writeRecord(postId, { ...existing, intent: liked });
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
      setLiked,
    }),
    [subscribe, getRecord, ensureRecord, seedLikeState, toggleLike, setLiked],
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
): { liked: boolean; count: number; toggle: () => void; like: () => void } {
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
  const intent = record?.intent ?? null;

  const liked = intent ?? serverLiked;
  const count =
    serverCount + (intent === null ? 0 : Number(intent) - Number(serverLiked));

  const toggle = useCallback(() => ctx.toggleLike(postId), [ctx, postId]);
  const like = useCallback(() => ctx.setLiked(postId, true), [ctx, postId]);

  return { liked, count, toggle, like };
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
