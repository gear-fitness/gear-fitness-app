import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { Conversation, Message, messageService } from "../api/messageService";
import { useAuth } from "./AuthContext";
import {
  connectDmSocket,
  disconnectDmSocket,
  onDmEvent,
  onDmStatus,
} from "../realtime/dmSocket";

/**
 * Global direct-message state: the primary inbox, the requests list, and the
 * unread total that feeds the bottom-nav badge. Thread history itself is kept
 * local to the thread screen; this store is the shared, cross-screen surface
 * (inbox list, badge counts) and mirrors the app's Context-only pattern.
 */
interface MessagesContextValue {
  inbox: Conversation[];
  requests: Conversation[];
  unreadCount: number;
  requestCount: number;
  inboxLoading: boolean;
  inboxRefreshing: boolean;
  hasMoreInbox: boolean;
  /** True once a real inbox fetch has completed, so the empty state doesn't flash. */
  inboxLoaded: boolean;

  /** `silent` skips the refresh spinner — used for background/focus refreshes. */
  refreshInbox: (options?: { silent?: boolean }) => Promise<void>;
  loadMoreInbox: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  refreshCounts: () => Promise<void>;
  /** Merge a conversation (after create/accept/send) into the inbox, top-first. */
  upsertConversation: (conversation: Conversation) => void;
  /** Drop a conversation from both lists (after decline/leave). */
  removeConversation: (conversationId: string) => void;
  /** Patch a conversation's muted flag in place (no refetch). */
  setConversationMuted: (conversationId: string, muted: boolean) => void;

  /**
   * Per-conversation message cache so reopening a thread paints instantly and
   * refreshes in the background (rather than showing a spinner every time).
   * Backed by a ref, not state: the thread screen owns the live list, so writing
   * to the cache must never re-render the whole provider.
   */
  getCachedMessages: (conversationId: string) => Message[] | undefined;
  setCachedMessages: (conversationId: string, messages: Message[]) => void;
  /** The already-loaded ConversationDTO, so a thread header can paint pre-fetch. */
  getCachedConversation: (conversationId: string) => Conversation | undefined;
  /**
   * A loaded 1:1 conversation with the given other user, if it's already in the
   * inbox/requests — lets a draft adopt an existing thread instantly (a server
   * lookup covers threads beyond the first page).
   */
  findLoadedDirect: (otherUserId: string) => Conversation | undefined;
}

const PAGE_SIZE = 20;

const MessagesContext = createContext<MessagesContextValue | undefined>(
  undefined,
);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxRefreshing, setInboxRefreshing] = useState(false);
  const [hasMoreInbox, setHasMoreInbox] = useState(true);
  const [inboxLoaded, setInboxLoaded] = useState(false);

  const pageRef = useRef(0);
  // Guards against overlapping loads clobbering each other's page cursor.
  const loadingRef = useRef(false);
  // conversationId -> messages (newest first). A ref so cache writes don't
  // re-render every consumer of this provider.
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());

  const getCachedMessages = useCallback(
    (conversationId: string) => messagesCacheRef.current.get(conversationId),
    [],
  );

  const setCachedMessages = useCallback(
    (conversationId: string, messages: Message[]) => {
      messagesCacheRef.current.set(conversationId, messages);
    },
    [],
  );

  const refreshCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [unread, reqs] = await Promise.all([
        messageService.getUnreadCount(),
        messageService.getRequestCount(),
      ]);
      setUnreadCount(unread);
      setRequestCount(reqs);
    } catch {
      // Non-fatal: badge counts refresh again on next focus.
    }
  }, [isAuthenticated]);

  const refreshInbox = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isAuthenticated || loadingRef.current) return;
      const silent = options?.silent ?? false;
      loadingRef.current = true;
      // Only a user-initiated pull shows the RefreshControl spinner; focus and
      // socket-driven refreshes update the list underneath silently.
      if (!silent) setInboxRefreshing(true);
      try {
        const page = await messageService.getInbox(0, PAGE_SIZE);
        setInbox(page.content);
        setHasMoreInbox(!page.last);
        pageRef.current = 0;
        setInboxLoaded(true);
      } catch {
        // Keep the last good list on error.
      } finally {
        if (!silent) setInboxRefreshing(false);
        loadingRef.current = false;
      }
      void refreshCounts();
    },
    [isAuthenticated, refreshCounts],
  );

  const loadMoreInbox = useCallback(async () => {
    if (!isAuthenticated || loadingRef.current || !hasMoreInbox) return;
    loadingRef.current = true;
    setInboxLoading(true);
    try {
      const next = pageRef.current + 1;
      const page = await messageService.getInbox(next, PAGE_SIZE);
      setInbox((prev) => dedupe([...prev, ...page.content]));
      setHasMoreInbox(!page.last);
      pageRef.current = next;
    } catch {
      // Leave hasMore as-is so a later scroll can retry.
    } finally {
      setInboxLoading(false);
      loadingRef.current = false;
    }
  }, [isAuthenticated, hasMoreInbox]);

  const refreshRequests = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const page = await messageService.getRequests(0, PAGE_SIZE);
      setRequests(page.content);
      setRequestCount(page.totalElements);
    } catch {
      // Non-fatal.
    }
  }, [isAuthenticated]);

  const upsertConversation = useCallback((conversation: Conversation) => {
    setInbox((prev) => {
      const without = prev.filter(
        (c) => c.conversationId !== conversation.conversationId,
      );
      return [conversation, ...without];
    });
    setRequests((prev) =>
      prev.filter((c) => c.conversationId !== conversation.conversationId),
    );
  }, []);

  const removeConversation = useCallback((conversationId: string) => {
    setInbox((prev) => prev.filter((c) => c.conversationId !== conversationId));
    setRequests((prev) =>
      prev.filter((c) => c.conversationId !== conversationId),
    );
    messagesCacheRef.current.delete(conversationId);
  }, []);

  const setConversationMuted = useCallback(
    (conversationId: string, muted: boolean) => {
      const patch = (list: Conversation[]) =>
        list.map((c) =>
          c.conversationId === conversationId ? { ...c, muted } : c,
        );
      setInbox(patch);
      setRequests(patch);
    },
    [],
  );

  const getCachedConversation = useCallback(
    (conversationId: string) =>
      inbox.find((c) => c.conversationId === conversationId) ??
      requests.find((c) => c.conversationId === conversationId),
    [inbox, requests],
  );

  // A DIRECT thread has exactly two participants, so one that includes the other
  // user is the 1:1 with them.
  const findLoadedDirect = useCallback(
    (otherUserId: string) => {
      const match = (c: Conversation) =>
        c.type === "DIRECT" &&
        c.participants.some((p) => p.userId === otherUserId);
      return inbox.find(match) ?? requests.find(match);
    },
    [inbox, requests],
  );

  // Seed the unread/request counts on login: the Profile badge has to be right
  // even if the DM inbox has never been opened this session (afterwards the
  // socket events and markRead keep it live).
  useEffect(() => {
    if (isAuthenticated) {
      void refreshCounts();
    }
  }, [isAuthenticated, refreshCounts]);

  // Real-time: keep the socket connected while authenticated, and refresh the
  // inbox (order + unread badge) whenever a DM event arrives or the socket
  // reconnects. Per-thread live updates are handled inside MessageThread.
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectDmSocket();
      // Don't leak one account's cached threads into the next login.
      messagesCacheRef.current.clear();
      return;
    }
    connectDmSocket();

    let timer: ReturnType<typeof setTimeout> | null = null;
    // Silent: these are background refreshes (an incoming message, a reconnect),
    // so the list updates underneath without flashing a refresh spinner.
    const debouncedRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refreshInbox({ silent: true }), 300);
    };

    const offEvent = onDmEvent((e) => {
      if (e.type === "message" || e.type === "seen") {
        debouncedRefresh();
      }
    });
    const offStatus = onDmStatus((connected) => {
      if (connected) debouncedRefresh();
    });

    // Drop the socket the moment the app is backgrounded, and reconnect when it
    // comes back. Without this the server keeps a half-dead session (iOS
    // suspends the app without cleanly closing the socket), still considers the
    // user "online", and therefore never sends them a push notification.
    // Only "background" counts — iOS fires a transient "inactive" for the app
    // switcher / control centre, which shouldn't tear down the connection.
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        connectDmSocket();
        debouncedRefresh();
      } else if (state === "background") {
        disconnectDmSocket();
      }
    });

    return () => {
      offEvent();
      offStatus();
      appStateSub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [isAuthenticated, refreshInbox]);

  const value = useMemo<MessagesContextValue>(
    () => ({
      inbox,
      requests,
      unreadCount,
      requestCount,
      inboxLoading,
      inboxRefreshing,
      hasMoreInbox,
      inboxLoaded,
      refreshInbox,
      loadMoreInbox,
      refreshRequests,
      refreshCounts,
      upsertConversation,
      removeConversation,
      setConversationMuted,
      getCachedMessages,
      setCachedMessages,
      getCachedConversation,
      findLoadedDirect,
    }),
    [
      inbox,
      requests,
      unreadCount,
      requestCount,
      inboxLoading,
      inboxRefreshing,
      hasMoreInbox,
      inboxLoaded,
      refreshInbox,
      loadMoreInbox,
      refreshRequests,
      refreshCounts,
      upsertConversation,
      removeConversation,
      setConversationMuted,
      getCachedMessages,
      setCachedMessages,
      getCachedConversation,
      findLoadedDirect,
    ],
  );

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

function dedupe(list: Conversation[]): Conversation[] {
  const seen = new Set<string>();
  const out: Conversation[] = [];
  for (const c of list) {
    if (!seen.has(c.conversationId)) {
      seen.add(c.conversationId);
      out.push(c);
    }
  }
  return out;
}

export function useMessages(): MessagesContextValue {
  const ctx = useContext(MessagesContext);
  if (!ctx) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return ctx;
}
