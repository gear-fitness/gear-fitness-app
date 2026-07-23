import { useCallback } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/Text";
import { useAuth } from "../../../context/AuthContext";
import { useMessages } from "../../../context/MessagesContext";
import { Conversation, messageService } from "../../../api/messageService";
import { ConversationRow } from "./ConversationRow";
import { conversationTitle } from "./conversationDisplay";
import { useDmTheme } from "./dmTheme";

export function DMInbox() {
  const t = useDmTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation() as any;
  const { user } = useAuth();
  const {
    inbox,
    inboxRefreshing,
    inboxLoading,
    hasMoreInbox,
    inboxLoaded,
    requestCount,
    refreshInbox,
    loadMoreInbox,
    removeConversation,
    setConversationMuted,
  } = useMessages();

  // Silent: the list already lives in context, so it paints instantly and the
  // refresh happens underneath. A spinner here would show on every single visit.
  useFocusEffect(
    useCallback(() => {
      void refreshInbox({ silent: true });
    }, [refreshInbox]),
  );

  const openThread = useCallback(
    (conversation: Conversation) => {
      navigation.navigate("MessageThread", {
        conversationId: conversation.conversationId,
      });
    },
    [navigation],
  );

  const confirmDelete = useCallback(
    (conversation: Conversation) => {
      const name = conversationTitle(conversation, user?.userId ?? "");
      Alert.alert(
        "Delete conversation?",
        `This removes "${name}" from your inbox. It stays for everyone else, and comes back if they message you again.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // Optimistic: drop it now, restore if the server rejects.
              removeConversation(conversation.conversationId);
              try {
                await messageService.deleteForMe(conversation.conversationId);
              } catch {
                Alert.alert("Error", "Couldn't delete that conversation.");
                void refreshInbox({ silent: true });
              }
            },
          },
        ],
      );
    },
    [user?.userId, removeConversation, refreshInbox],
  );

  const toggleMute = useCallback(
    async (conversation: Conversation) => {
      const next = !conversation.muted;
      setConversationMuted(conversation.conversationId, next); // optimistic
      try {
        await messageService.setMuted(conversation.conversationId, next);
      } catch {
        setConversationMuted(conversation.conversationId, conversation.muted);
        Alert.alert("Error", "Couldn't update that conversation.");
      }
    },
    [setConversationMuted],
  );

  // Long-press → native iOS action sheet (Alert menu on Android).
  const showRowMenu = useCallback(
    (conversation: Conversation) => {
      const name = conversationTitle(conversation, user?.userId ?? "");
      const muteLabel = conversation.muted ? "Unmute" : "Mute";
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: name,
            options: [muteLabel, "Delete", "Cancel"],
            destructiveButtonIndex: 1,
            cancelButtonIndex: 2,
          },
          (i) => {
            if (i === 0) void toggleMute(conversation);
            else if (i === 1) confirmDelete(conversation);
          },
        );
      } else {
        Alert.alert(name, undefined, [
          { text: muteLabel, onPress: () => void toggleMute(conversation) },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => confirmDelete(conversation),
          },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    },
    [user?.userId, toggleMute, confirmDelete],
  );

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationRow
        conversation={item}
        myUserId={user?.userId ?? ""}
        onPress={() => openThread(item)}
        onLongPress={() => showRowMenu(item)}
      />
    ),
    [user?.userId, openThread, showRowMenu],
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: t.bg, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Messages</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("NewMessage")}
          hitSlop={12}
          accessibilityLabel="New message"
        >
          <Ionicons name="create-outline" size={25} color={t.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={inbox}
        keyExtractor={(c) => c.conversationId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        // Don't rubber-band when the list is empty or fits the screen; it still
        // scrolls normally once there are enough conversations to overflow.
        alwaysBounceVertical={false}
        ListHeaderComponent={
          requestCount > 0 ? (
            <TouchableOpacity
              style={styles.requestsRow}
              onPress={() => navigation.navigate("MessageRequests")}
              activeOpacity={0.6}
            >
              <View
                style={[styles.requestsIcon, { backgroundColor: t.bubbleIn }]}
              >
                <Ionicons name="mail-outline" size={23} color={t.text} />
              </View>
              <View style={styles.requestsBody}>
                <Text style={[styles.requestsLabel, { color: t.text }]}>
                  Requests
                </Text>
                <Text style={[styles.requestsSub, { color: t.textMuted }]}>
                  {requestCount === 1
                    ? "1 person wants to message you"
                    : `${requestCount} people want to message you`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={t.textFaint} />
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          // Only once a real fetch has landed — otherwise a cold start flashes
          // "No messages yet" before the inbox arrives.
          inboxLoaded ? (
            <View style={styles.empty}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={44}
                color={t.textFaint}
              />
              <Text style={[styles.emptyTitle, { color: t.text }]}>
                No messages yet
              </Text>
              <Text style={[styles.emptyBody, { color: t.textMuted }]}>
                Start a conversation with someone you follow.
              </Text>
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: t.text }]}
                onPress={() => navigation.navigate("NewMessage")}
                activeOpacity={0.85}
              >
                <Text style={[styles.emptyCtaText, { color: t.bg }]}>
                  Send a message
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={inboxRefreshing}
            onRefresh={refreshInbox}
            tintColor={t.textMuted}
          />
        }
        onEndReached={() => void loadMoreInbox()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          inboxLoading && hasMoreInbox ? (
            <ActivityIndicator style={styles.footer} color={t.textFaint} />
          ) : null
        }
      />
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  listContent: {
    paddingBottom: 24,
  },
  requestsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  requestsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  requestsBody: {
    flex: 1,
    minWidth: 0,
  },
  requestsLabel: {
    fontSize: 15.5,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  requestsSub: {
    fontSize: 14,
    letterSpacing: -0.1,
    marginTop: 3,
  },
  empty: {
    alignItems: "center",
    marginTop: 110,
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: 14,
  },
  emptyBody: {
    fontSize: 14,
    letterSpacing: -0.1,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 5,
  },
  emptyCta: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCtaText: {
    fontSize: 14.5,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  footer: {
    paddingVertical: 18,
  },
});
