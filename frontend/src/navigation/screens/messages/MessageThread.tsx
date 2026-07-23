import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Text } from "../../../components/Text";
import { PhotoSourceMenu } from "../../../components/PhotoSourceMenu";
import { openCamera } from "../../../utils/inAppCamera";
import { uploadMessageImage } from "../../../api/imageService";
import { useAuth } from "../../../context/AuthContext";
import { useMessages } from "../../../context/MessagesContext";
import {
  Conversation,
  messageService,
} from "../../../api/messageService";
import {
  onDmEvent,
  onDmStatus,
  sendTyping,
} from "../../../realtime/dmSocket";
import {
  conversationTitle,
  otherParticipants,
  sameRun,
  startsNewSession,
  sessionLabel,
} from "./conversationDisplay";
import { ConversationAvatar, AvatarMember } from "./ConversationAvatar";
import { MessageRow, UIMessage, REVEAL_WIDTH } from "./MessageRow";
import { useDmTheme } from "./dmTheme";

/**
 * Why a send failed, in the user's words. The server's reason isn't available
 * to the client (Spring Boot's `server.error.include-message` defaults to
 * `never`, so the body carries no message), so map the status instead.
 */
function sendFailureReason(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (!status) return "Not delivered — check your connection";
  if (status === 403) return "Not delivered — you can't message this person";
  if (status === 404) return "Not delivered — conversation unavailable";
  return "Not delivered";
}

// Just enough about each picked recipient to render the header before the
// conversation is created (a draft carries these instead of a conversationId).
type DraftUser = {
  userId: string;
  username: string;
  displayName?: string | null;
  profilePictureUrl?: string | null;
};

function draftTitle(users: DraftUser[] | undefined): string {
  if (!users || users.length === 0) return "New message";
  return users.map((u) => u.displayName || u.username).join(", ");
}

const PAGE_SIZE = 30;

function newNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function MessageThread() {
  const t = useDmTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const routeConversationId: string | undefined = route.params?.conversationId;
  const draftUserIds: string[] | undefined = route.params?.draftUserIds;
  const draftUsers: DraftUser[] | undefined = route.params?.draftUsers;
  const { user } = useAuth();
  const myId = user?.userId ?? "";
  const {
    refreshCounts,
    refreshInbox,
    removeConversation,
    getCachedMessages,
    setCachedMessages,
    getCachedConversation,
    findLoadedDirect,
  } = useMessages();

  // Undefined for a draft — no conversation is created until the first send.
  const [conversationId, setConversationId] = useState<string | undefined>(
    routeConversationId,
  );
  const isDraft = !conversationId;

  // Paint from cache immediately (Instagram-style) — the header from the
  // conversation already in the inbox, the bubbles from the last time this
  // thread was open. The background fetch below then reconciles.
  const [conversation, setConversation] = useState<Conversation | null>(() =>
    conversationId ? (getCachedConversation(conversationId) ?? null) : null,
  );
  const [messages, setMessages] = useState<UIMessage[]>(() =>
    conversationId ? (getCachedMessages(conversationId) ?? []) : [],
  );
  const [draft, setDraft] = useState("");
  // Spinner only on a genuine first open of a real conversation with no cache.
  const [loading, setLoading] = useState(
    () =>
      !!conversationId &&
      (getCachedMessages(conversationId)?.length ?? 0) === 0,
  );
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  // Runs the draft→existing-thread resolve at most once.
  const draftResolvedRef = useRef(false);
  // Typing debounce: whether we've sent "typing: true", plus the idle timer that
  // sends "typing: false", and the timer that clears the incoming indicator.
  const typingSentRef = useRef(false);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The message TextInput, plus a one-shot flag to swallow the autocorrect-commit
  // echo iOS fires right after we clear the field on send (which would otherwise
  // repopulate the box with the corrected word).
  const inputRef = useRef<TextInput>(null);
  const suppressEchoRef = useRef(false);

  // Swipe the thread left to reveal each message's exact send time, springing
  // back on release. One shared value drives every row, so they reveal together
  // (Instagram behaviour) entirely on the native thread — no setState per frame.
  // Left-only activation (negative activeOffsetX): vertical scrolling still wins
  // on vertical drags, and rightward swipes pass through to the native stack's
  // full-screen swipe-back gesture instead of being captured here.
  const panX = useSharedValue(0);
  const revealGesture = Gesture.Pan()
    .activeOffsetX(-15)
    .onUpdate((e) => {
      panX.value = Math.max(-REVEAL_WIDTH, Math.min(0, e.translationX));
    })
    .onEnd(() => {
      // Ease straight back with no overshoot — a spring here oscillated.
      panX.value = withTiming(0, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    });

  // Drive the bottom inset from the live keyboard frame so the input bar tracks
  // the keyboard continuously — including the interactive swipe-to-dismiss drag.
  // keyboard-controller's native frame observer reports every frame of that drag
  // (reanimated's own useAnimatedKeyboard only reported the final open/closed
  // state here). Closed → home-indicator inset; open → keyboard height.
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const bottomInsetStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(-keyboardHeight.value, insets.bottom),
  }));

  const markReadTo = useCallback(
    (latest?: UIMessage) => {
      if (!conversationId || !latest || latest.pending) return;
      void messageService
        .markRead(conversationId, latest.messageId)
        .then(() => refreshCounts())
        .catch(() => {});
    },
    [conversationId, refreshCounts],
  );

  // Note: deliberately does NOT set loading=true — when we already painted from
  // cache this is a background refresh, and flipping to a spinner would undo the
  // instant render. `loading` starts true only when there was nothing cached.
  const loadInitial = useCallback(async () => {
    if (!conversationId) return; // draft: nothing to load yet
    try {
      const [conv, page] = await Promise.all([
        messageService.getConversation(conversationId),
        messageService.getMessages(conversationId, 0, PAGE_SIZE),
      ]);
      setConversation(conv);
      setMessages(page.content);
      pageRef.current = 0;
      hasMoreRef.current = !page.last;
      markReadTo(page.content[0]);
    } catch {
      // Keep whatever was cached; the user can back out or pull again.
    } finally {
      setLoading(false);
    }
  }, [conversationId, markReadTo]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  // A 1:1 draft to someone you already have a thread with should show that
  // thread's history right away, not a blank screen until the first send. Adopt
  // the existing conversation — from the loaded inbox first, then a read-only
  // server lookup for contacts beyond the first inbox page — which flips this out
  // of draft mode so the normal load/subscribe effects take over. This creates
  // nothing; a brand-new 1:1 stays a draft until you actually send.
  useEffect(() => {
    if (draftResolvedRef.current || conversationId) return;
    if (!draftUserIds || draftUserIds.length !== 1) return; // 1:1 only
    draftResolvedRef.current = true;
    const otherId = draftUserIds[0];

    const adopt = (conv: Conversation) => {
      setConversation(conv);
      const cached = getCachedMessages(conv.conversationId);
      if (cached && cached.length > 0) {
        setMessages(cached);
      } else {
        setLoading(true); // loadInitial will show a brief spinner, not a blank
      }
      setConversationId(conv.conversationId);
    };

    const loaded = findLoadedDirect(otherId);
    if (loaded) {
      adopt(loaded);
      return;
    }
    void messageService
      .findDirect(otherId)
      .then((conv) => {
        if (conv) adopt(conv);
      })
      .catch(() => {
        // No existing thread resolvable — stay a draft; first send creates it.
      });
  }, [conversationId, draftUserIds, findLoadedDirect, getCachedMessages]);

  // Keep the cache warm so reopening this thread paints instantly. Only
  // server-confirmed messages are cached — restoring a still-"pending" or
  // failed optimistic bubble on reopen would be a ghost.
  useEffect(() => {
    if (!conversationId) return;
    const persisted = messages.filter((m) => !m.pending && !m.failed);
    if (persisted.length > 0) {
      setCachedMessages(conversationId, persisted);
    }
  }, [messages, conversationId, setCachedMessages]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || loadingOlder || !hasMoreRef.current) return;
    setLoadingOlder(true);
    try {
      const next = pageRef.current + 1;
      const page = await messageService.getMessages(
        conversationId,
        next,
        PAGE_SIZE,
      );
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.messageId));
        return [...prev, ...page.content.filter((m) => !seen.has(m.messageId))];
      });
      pageRef.current = next;
      hasMoreRef.current = !page.last;
    } catch {
      // Retry on next scroll.
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder]);

  // Pull the newest page and merge in anything we're missing — used to backfill
  // after a socket reconnect (the fallback for events dropped while offline).
  const refetchLatest = useCallback(async () => {
    if (!conversationId) return;
    try {
      const page = await messageService.getMessages(
        conversationId,
        0,
        PAGE_SIZE,
      );
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.messageId));
        const additions = page.content.filter((m) => !seen.has(m.messageId));
        return additions.length ? [...additions, ...prev] : prev;
      });
    } catch {
      // Ignore; next event or focus will reconcile.
    }
  }, [conversationId]);

  // Live updates for this conversation over the DM socket. A draft has no
  // conversation to subscribe to yet — this re-runs once the first send creates
  // one (conversationId is in the deps).
  useEffect(() => {
    if (!conversationId) return;
    const off = onDmEvent((e) => {
      if (e.conversationId !== conversationId) return;

      if (e.type === "message" && e.message) {
        const incoming = e.message;
        setMessages((prev) => {
          const dupe = prev.some(
            (m) =>
              m.messageId === incoming.messageId ||
              (!!incoming.clientNonce && m.clientNonce === incoming.clientNonce),
          );
          if (dupe) {
            return prev.map((m) =>
              incoming.clientNonce && m.clientNonce === incoming.clientNonce
                ? incoming
                : m,
            );
          }
          return [incoming, ...prev];
        });
        if (incoming.senderId !== myId) {
          void messageService
            .markRead(conversationId, incoming.messageId)
            .then(() => refreshCounts())
            .catch(() => {});
        }
      } else if (e.type === "seen" && e.userId && e.userId !== myId) {
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map((p) =>
                  p.userId === e.userId
                    ? { ...p, lastReadMessageId: e.lastReadMessageId ?? null }
                    : p,
                ),
              }
            : prev,
        );
      } else if (e.type === "accepted" && e.userId) {
        // They accepted the request — drop their pending state so the photo
        // option unlocks without needing a reload.
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map((p) =>
                  p.userId === e.userId ? { ...p, state: "ACCEPTED" } : p,
                ),
              }
            : prev,
        );
      } else if (e.type === "left" && e.userId) {
        // They left (e.g. declined a group request) — drop them from the thread
        // so the photo gate (awaitingAcceptance) and the group avatar/header
        // update live without a reload.
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.filter(
                  (p) => p.userId !== e.userId,
                ),
              }
            : prev,
        );
      } else if (e.type === "typing" && e.userId !== myId) {
        if (e.typing) {
          setTypingUser(e.username ?? "");
          if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
          typingClearTimer.current = setTimeout(
            () => setTypingUser(null),
            4000,
          );
        } else {
          setTypingUser(null);
        }
      }
    });

    const offStatus = onDmStatus((connected) => {
      if (connected) void refetchLatest();
    });

    return () => {
      off();
      offStatus();
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
    };
  }, [conversationId, myId, refreshCounts, refetchLatest]);

  const stopTyping = useCallback(() => {
    if (typingStopTimer.current) {
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = null;
    }
    if (typingSentRef.current && conversationId) {
      typingSentRef.current = false;
      sendTyping(conversationId, false);
    }
  }, [conversationId]);

  const onDraftChange = useCallback(
    (text: string) => {
      // Right after a send, iOS commits any pending autocorrection and emits it
      // here — swallow that one echo and keep the field empty. Consumed on the
      // first change so it never eats a real keystroke.
      if (suppressEchoRef.current) {
        suppressEchoRef.current = false;
        inputRef.current?.clear();
        return;
      }
      setDraft(text);
      // No typing signal in a draft — there's no conversation to send it to yet.
      if (conversationId && !typingSentRef.current) {
        typingSentRef.current = true;
        sendTyping(conversationId, true);
      }
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      typingStopTimer.current = setTimeout(stopTyping, 3000);
    },
    [conversationId, stopTyping],
  );

  const doSend = useCallback(async () => {
    const content = draft.trim();
    if (!content) return;
    if (!conversationId && (!draftUserIds || draftUserIds.length === 0)) return;
    setDraft("");
    // Clear the native field too and arm the echo guard, so a pending iOS
    // autocorrection committed after the clear doesn't repopulate the box. The
    // timeout self-releases the flag when no echo comes (a normal send).
    inputRef.current?.clear();
    suppressEchoRef.current = true;
    setTimeout(() => {
      suppressEchoRef.current = false;
    }, 100);
    stopTyping();
    const nonce = newNonce();
    const optimistic: UIMessage = {
      messageId: `temp-${nonce}`,
      conversationId: conversationId ?? "",
      senderId: myId,
      senderUsername: user?.username ?? "",
      senderProfilePictureUrl: user?.profilePictureUrl ?? null,
      content,
      mediaKeys: [],
      createdAt: new Date().toISOString(),
      deleted: false,
      clientNonce: nonce,
      pending: true,
    };
    setMessages((prev) => [optimistic, ...prev]);
    try {
      // Draft: create the conversation together with this first message.
      // createConversation dedupes a 1:1 and un-hides a deleted thread, so a
      // draft to an existing contact reuses it rather than duplicating.
      let cid = conversationId;
      if (!cid) {
        const conv = await messageService.createConversation(draftUserIds!);
        cid = conv.conversationId;
        setConversation(conv); // header now reflects the real conversation
      }
      const saved = await messageService.sendMessage(cid, {
        content,
        clientNonce: nonce,
      });
      setMessages((prev) =>
        prev.map((m) => (m.clientNonce === nonce ? saved : m)),
      );
      // Promote to a real thread only AFTER the message is in state, so the
      // load-on-id-change effect can't race in and wipe the optimistic bubble.
      if (!conversationId) setConversationId(cid);
      // Silent: this is a background reorder, not a user pull. A non-silent
      // refresh flips the inbox RefreshControl on while we're still in the
      // thread, and backing out fast can leave that spinner stuck.
      void refreshInbox({ silent: true });
    } catch (e) {
      const failReason = sendFailureReason(e);
      setMessages((prev) =>
        prev.map((m) =>
          m.clientNonce === nonce
            ? { ...m, pending: false, failed: true, failReason }
            : m,
        ),
      );
    }
  }, [
    draft,
    conversationId,
    draftUserIds,
    myId,
    user,
    refreshInbox,
    stopTyping,
  ]);

  /**
   * Send a photo as its own message (Instagram-style: one image, no caption).
   * The optimistic bubble carries the local file:// uri in mediaKeys — the image
   * cache passes on-device URIs straight through, so it renders immediately and
   * is swapped for the real S3 key when the send resolves.
   */
  const sendImage = useCallback(
    async (uri: string) => {
      if (!conversationId) return; // photos aren't offered until the thread exists
      const nonce = newNonce();
      let localUri = uri;
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );
        localUri = compressed.uri;
      } catch {
        // Fall back to the original picked file if manipulation fails.
      }

      const optimistic: UIMessage = {
        messageId: `temp-${nonce}`,
        conversationId,
        senderId: myId,
        senderUsername: user?.username ?? "",
        senderProfilePictureUrl: user?.profilePictureUrl ?? null,
        content: null,
        mediaKeys: [localUri],
          createdAt: new Date().toISOString(),
        deleted: false,
        clientNonce: nonce,
        pending: true,
      };
      setMessages((prev) => [optimistic, ...prev]);

      try {
        const key = await uploadMessageImage(localUri);
        const saved = await messageService.sendMessage(conversationId, {
          mediaKeys: [key],
          clientNonce: nonce,
        });
        setMessages((prev) =>
          prev.map((m) => (m.clientNonce === nonce ? saved : m)),
        );
        void refreshInbox({ silent: true }); // background reorder, no spinner
      } catch (e) {
        const failReason = sendFailureReason(e);
        setMessages((prev) =>
          prev.map((m) =>
            m.clientNonce === nonce
              ? { ...m, pending: false, failed: true, failReason }
              : m,
          ),
        );
      }
    },
    [conversationId, myId, user, refreshInbox],
  );

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri) await sendImage(uri);
  }, [sendImage]);

  const takePhoto = useCallback(async () => {
    const result = await openCamera(navigation, {
      library: { quality: 0.9 },
    });
    const uri = result?.uris[0];
    if (uri) await sendImage(uri);
  }, [navigation, sendImage]);

  const acceptRequest = useCallback(async () => {
    if (!conversationId) return;
    try {
      const conv = await messageService.accept(conversationId);
      setConversation(conv);
      void refreshInbox({ silent: true }); // background reorder, no spinner
    } catch {
      // Ignore.
    }
  }, [conversationId, refreshInbox]);

  const declineRequest = useCallback(async () => {
    if (!conversationId) return;
    try {
      await messageService.decline(conversationId);
      removeConversation(conversationId);
      navigation.goBack();
    } catch {
      // Ignore.
    }
  }, [conversationId, removeConversation, navigation]);

  // Header + grouping fall back to the draft recipients until the conversation
  // exists.
  const title = conversation
    ? conversationTitle(conversation, myId)
    : draftTitle(draftUsers);
  const isPending = conversation?.myState === "PENDING";
  const isGroup = conversation
    ? conversation.type === "GROUP"
    : (draftUserIds?.length ?? 0) > 1;
  // Header avatar members: the real conversation's other participants, or the
  // draft recipients before it exists. Groups stack the first two (IG-style).
  const headerMembers: AvatarMember[] = conversation
    ? otherParticipants(conversation, myId)
    : (draftUsers ?? []);
  // Someone on the other side still has this thread as a request. Until they
  // accept, photos can't be sent (the server enforces it too), so the photo
  // option isn't offered at all.
  const awaitingAcceptance = !!conversation?.participants.some(
    (p) => p.userId !== myId && p.state === "PENDING",
  );

  // "Seen" for a 1:1: the other participant's read pointer reached my newest
  // message.
  const seenByOther = (() => {
    if (!conversation || conversation.type !== "DIRECT") return false;
    const newestMine = messages.find((m) => m.senderId === myId && !m.pending);
    if (!newestMine) return false;
    const other = conversation.participants.find((p) => p.userId !== myId);
    return other?.lastReadMessageId === newestMine.messageId;
  })();

  const renderItem = useCallback(
    ({ item, index }: { item: UIMessage; index: number }) => {
      const mine = item.senderId === myId;
      const showSeen = mine && !item.pending && index === 0 && seenByOther;

      // The list is inverted and newest-first, so messages[index + 1] is the
      // one visually ABOVE (older) and messages[index - 1] the one below.
      const older = messages[index + 1];
      const newer = messages[index - 1];

      const runWithOlder = sameRun(older, item);
      const runWithNewer = sameRun(item, newer);

      // Name a run of another member's messages once, at its top (groups only).
      const showSender = isGroup && !mine && !runWithOlder;
      // The avatar (and its run-tail) sit on the last message of a run.
      const isRunEnd = !runWithNewer;
      // A centered time separator heads each new session (day change or a gap).
      const showSession = startsNewSession(older, item);

      return (
        <MessageRow
          item={item}
          mine={mine}
          showSender={showSender}
          isRunEnd={isRunEnd}
          runWithOlder={runWithOlder}
          showSession={showSession}
          sessionText={showSession ? sessionLabel(item.createdAt) : ""}
          showSeen={showSeen}
          panX={panX}
        />
      );
    },
    [messages, myId, isGroup, seenByOther, panX],
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: t.bg, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>
        {/* For a real group the header opens group details; a draft or 1:1 is
            not tappable. Renders from draft recipients until the conversation
            exists. */}
        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={conversation && isGroup ? 0.6 : 1}
          disabled={!conversation || !isGroup}
          onPress={() =>
            conversationId &&
            navigation.navigate("GroupDetails", { conversationId })
          }
        >
          <ConversationAvatar
            type={isGroup ? "GROUP" : "DIRECT"}
            imageKey={conversation?.imageKey}
            members={headerMembers}
            fallbackName={title}
            size={30}
            style={styles.headerAvatar}
          />
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: t.text }]}
          >
            {title}
          </Text>
          {conversation && isGroup ? (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={t.textFaint}
              style={styles.headerChevron}
            />
          ) : null}
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={t.textFaint} />
      ) : (
        <GestureDetector gesture={revealGesture}>
          <FlatList
            data={messages}
            keyExtractor={(m) => m.messageId}
            renderItem={renderItem}
            inverted
            style={styles.list}
            contentContainerStyle={styles.listContent}
            onEndReached={() => void loadOlder()}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingOlder ? (
                <ActivityIndicator style={styles.footer} color={t.textFaint} />
              ) : null
            }
            keyboardShouldPersistTaps="handled"
            // Drag the messages down toward the keyboard to dismiss it, tracking
            // the finger (iMessage-style); falls back to on-drag on Android.
            keyboardDismissMode="interactive"
          />
        </GestureDetector>
      )}

      {typingUser !== null && !isPending ? (
        <View style={styles.typingRow}>
          <Text style={[styles.typingText, { color: t.textMuted }]}>
            {isGroup && typingUser ? `${typingUser} is typing…` : "Typing…"}
          </Text>
        </View>
      ) : null}

      {awaitingAcceptance && !isPending ? (
        <View style={styles.typingRow}>
          <Text style={[styles.typingText, { color: t.textFaint }]}>
            {isGroup
              ? "You can send photos once everyone accepts your request."
              : "They need to accept your request before you can send photos."}
          </Text>
        </View>
      ) : null}

      <Animated.View style={bottomInsetStyle}>
        {isPending ? (
          <View
            style={[
              styles.requestBar,
              {
                backgroundColor: t.bg,
                paddingBottom: 10,
                borderTopColor: t.border,
              },
            ]}
          >
            <Text style={[styles.requestPrompt, { color: t.textMuted }]}>
              Accept this message request to reply.
            </Text>
            <View style={styles.requestButtons}>
              <TouchableOpacity
                style={[styles.requestBtn, { borderColor: t.border }]}
                onPress={declineRequest}
                activeOpacity={0.7}
              >
                <Text style={[styles.requestBtnText, { color: t.text }]}>
                  Delete
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.requestBtn,
                  { backgroundColor: t.text, borderColor: t.text },
                ]}
                onPress={acceptRequest}
                activeOpacity={0.85}
              >
                <Text style={[styles.requestBtnText, { color: t.bg }]}>
                  Accept
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: t.bg,
                paddingBottom: 8,
                borderTopColor: t.border,
              },
            ]}
          >
            {!awaitingAcceptance && !isDraft ? (
              <PhotoSourceMenu
                width={34}
                height={34}
                onTakePhoto={takePhoto}
                onChooseFromLibrary={pickFromLibrary}
                accessibilityLabel="Send a photo"
                style={styles.photoBtn}
              >
                <View style={styles.photoBtnInner}>
                  <Ionicons name="image-outline" size={25} color={t.text} />
                </View>
              </PhotoSourceMenu>
            ) : null}
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={onDraftChange}
              placeholder="Message"
              placeholderTextColor={t.textFaint}
              multiline
              style={[
                styles.input,
                { backgroundColor: t.bubbleIn, color: t.text },
              ]}
            />
            <TouchableOpacity
              onPress={doSend}
              disabled={!draft.trim()}
              style={[
                styles.sendBtn,
                { backgroundColor: draft.trim() ? t.text : t.bubbleIn },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={19}
                color={draft.trim() ? t.bg : t.textFaint}
              />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  headerAvatar: {
    marginRight: 8,
  },
  headerChevron: {
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  headerSpacer: {
    width: 26,
  },
  list: {
    flex: 1,
  },
  loader: {
    marginTop: 40,
  },
  footer: {
    paddingVertical: 16,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  photoBtn: {
    width: 34,
    height: 34,
    marginRight: 8,
    marginBottom: 3,
  },
  photoBtnInner: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  typingRow: {
    paddingHorizontal: 22,
    paddingBottom: 5,
  },
  typingText: {
    fontSize: 12,
    letterSpacing: -0.1,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 15.5,
    letterSpacing: -0.2,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginBottom: 1,
  },
  requestBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  requestPrompt: {
    fontSize: 13,
    letterSpacing: -0.1,
    marginBottom: 12,
  },
  requestButtons: {
    flexDirection: "row",
    gap: 10,
  },
  requestBtn: {
    minWidth: 128,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  requestBtnText: {
    fontSize: 14.5,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
