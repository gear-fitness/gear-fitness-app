import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/Text";
import { Avatar } from "../../../components/Avatar";
import { SearchBar } from "../../../components/SearchBar";
import { searchUsers } from "../../../api/userService";
import { SearchUserResult } from "../../../api/types";
import {
  Conversation,
  ConversationParticipant,
  messageService,
} from "../../../api/messageService";
import { useAuth } from "../../../context/AuthContext";
import { useMessages } from "../../../context/MessagesContext";
import { useDmTheme } from "./dmTheme";

/**
 * Group details: members, rename, add/remove, leave. Admin-only controls are
 * hidden for members (the server enforces it regardless — a non-admin gets 403).
 */
export function GroupDetails() {
  const t = useDmTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const conversationId: string = route.params?.conversationId;
  const { user } = useAuth();
  const myId = user?.userId ?? "";
  const { getCachedConversation, upsertConversation, removeConversation } =
    useMessages();

  const [conversation, setConversation] = useState<Conversation | null>(
    () => getCachedConversation(conversationId) ?? null,
  );
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const conv = await messageService.getConversation(conversationId);
      setConversation(conv);
      setTitle(conv.title ?? "");
    } catch {
      // Keep the cached view.
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (conversation && !title) setTitle(conversation.title ?? "");
    // Only seeds the field once from the loaded conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.conversationId]);

  const isAdmin = conversation?.myRole === "ADMIN";
  const members = conversation?.participants ?? [];

  // Debounced people search, excluding self and existing members.
  useEffect(() => {
    const q = query.trim();
    if (!q || !adding) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const found = await searchUsers(q);
        if (cancelled) return;
        const existing = new Set(members.map((m) => m.userId));
        setResults(
          found.filter((u) => u.userId !== myId && !existing.has(u.userId)),
        );
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, adding, members, myId]);

  const saveTitle = useCallback(async () => {
    const next = title.trim();
    if (!conversation || next === (conversation.title ?? "")) return;
    setBusy(true);
    try {
      const updated = await messageService.updateGroup(conversationId, {
        title: next,
      });
      setConversation(updated);
      upsertConversation(updated);
    } catch {
      Alert.alert("Error", "Couldn't rename the group.");
    } finally {
      setBusy(false);
    }
  }, [title, conversation, conversationId, upsertConversation]);

  const addMember = useCallback(
    async (u: SearchUserResult) => {
      setBusy(true);
      try {
        const updated = await messageService.addParticipants(conversationId, [
          u.userId,
        ]);
        setConversation(updated);
        upsertConversation(updated);
        setQuery("");
        setAdding(false);
      } catch {
        Alert.alert("Error", `Couldn't add ${u.username}.`);
      } finally {
        setBusy(false);
      }
    },
    [conversationId, upsertConversation],
  );

  const removeMember = useCallback(
    (p: ConversationParticipant) => {
      Alert.alert("Remove member?", `Remove ${p.username} from this group?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await messageService.removeParticipant(conversationId, p.userId);
              await load();
            } catch {
              Alert.alert("Error", `Couldn't remove ${p.username}.`);
            }
          },
        },
      ]);
    },
    [conversationId, load],
  );

  const leaveGroup = useCallback(() => {
    Alert.alert(
      "Leave group?",
      "You'll stop receiving messages from this group.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await messageService.leave(conversationId);
              removeConversation(conversationId);
              // Back to the Messages inbox (pops off this thread + details),
              // not popToTop() which would dump you on the Profile tab.
              navigation.navigate("Messages");
            } catch {
              Alert.alert("Error", "Couldn't leave the group.");
            }
          },
        },
      ],
    );
  }, [conversationId, removeConversation, navigation]);

  const renderMember = ({ item }: { item: ConversationParticipant }) => (
    <View style={styles.memberRow}>
      <Avatar
        username={item.username}
        profilePictureUrl={item.profilePictureUrl}
        size={40}
        style={styles.memberAvatar}
      />
      <View style={styles.memberBody}>
        <Text style={[styles.memberName, { color: t.text }]}>
          {item.username}
          {item.userId === myId ? " (you)" : ""}
        </Text>
        <Text style={[styles.memberSub, { color: t.textMuted }]}>
          {item.role === "ADMIN" ? "Admin" : "Member"}
          {item.state === "PENDING" ? " · Invite pending" : ""}
        </Text>
      </View>
      {isAdmin && item.userId !== myId ? (
        <TouchableOpacity onPress={() => removeMember(item)} hitSlop={10}>
          <Ionicons name="remove-circle-outline" size={22} color="#e5484d" />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: t.bg, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>
          Group details
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={members}
        keyExtractor={(m) => m.userId}
        renderItem={renderMember}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={[styles.label, { color: t.textMuted }]}>NAME</Text>
            {isAdmin ? (
              <TextInput
                value={title}
                onChangeText={setTitle}
                onBlur={saveTitle}
                onSubmitEditing={saveTitle}
                placeholder="Group name"
                placeholderTextColor={t.textMuted}
                returnKeyType="done"
                editable={!busy}
                style={[
                  styles.nameInput,
                  { backgroundColor: t.surface, color: t.text },
                ]}
              />
            ) : (
              <Text style={[styles.nameStatic, { color: t.text }]}>
                {conversation?.title || "Group"}
              </Text>
            )}

            <View style={styles.membersHeader}>
              <Text style={[styles.label, { color: t.textMuted }]}>
                {members.length} MEMBERS
              </Text>
              <TouchableOpacity
                onPress={() => setAdding((v) => !v)}
                hitSlop={10}
              >
                <Text style={[styles.addToggle, { color: t.text }]}>
                  {adding ? "Cancel" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>

            {adding ? (
              <View style={styles.addBlock}>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search people"
                  autoFocus
                />
                {results.map((u) => (
                  <TouchableOpacity
                    key={u.userId}
                    style={styles.resultRow}
                    onPress={() => addMember(u)}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      username={u.username}
                      profilePictureUrl={u.profilePictureUrl}
                      size={36}
                      style={styles.memberAvatar}
                    />
                    <Text style={[styles.memberName, { color: t.text }]}>
                      {u.username}
                    </Text>
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color={t.text}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.leaveBtn} onPress={leaveGroup}>
            <Text style={styles.leaveText}>Leave group</Text>
          </TouchableOpacity>
        }
      />

      {busy ? (
        <ActivityIndicator style={styles.busy} color={t.text} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 26 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  nameInput: {
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  nameStatic: {
    marginHorizontal: 20,
    fontSize: 17,
    fontWeight: "600",
  },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 20,
  },
  addToggle: { fontSize: 15, fontWeight: "600", paddingTop: 10 },
  addBlock: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  memberAvatar: { marginRight: 12 },
  memberBody: { flex: 1 },
  memberName: { flex: 1, fontSize: 16, fontWeight: "600" },
  memberSub: { fontSize: 12, marginTop: 2 },
  leaveBtn: {
    marginTop: 28,
    marginHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  leaveText: { color: "#e5484d", fontSize: 16, fontWeight: "600" },
  busy: { position: "absolute", top: 60, alignSelf: "center" },
});
