import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/Text";
import { Avatar } from "../../../components/Avatar";
import { SearchBar } from "../../../components/SearchBar";
import { searchUsers } from "../../../api/userService";
import { SearchUserResult } from "../../../api/types";
import { useAuth } from "../../../context/AuthContext";
import { useDmTheme } from "./dmTheme";

export function NewMessage() {
  const t = useDmTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation() as any;
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchUserResult[]>([]);

  // Debounced user search (mirrors the Explore tab's 200ms debounce).
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchUsers(q);
        if (!cancelled) {
          setResults(found.filter((u) => u.userId !== user?.userId));
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, user?.userId]);

  const toggle = useCallback((u: SearchUserResult) => {
    setSelected((prev) =>
      prev.some((s) => s.userId === u.userId)
        ? prev.filter((s) => s.userId !== u.userId)
        : [...prev, u],
    );
  }, []);

  const startChat = useCallback(() => {
    if (selected.length === 0) return;
    // Open a DRAFT — the conversation isn't created until the first message is
    // sent, so backing out without typing leaves nothing behind. Replace so
    // backing out returns to the inbox, not the picker.
    navigation.replace("MessageThread", {
      draftUserIds: selected.map((s) => s.userId),
      draftUsers: selected.map((s) => ({
        userId: s.userId,
        username: s.username,
        displayName: s.displayName,
        profilePictureUrl: s.profilePictureUrl,
      })),
    });
  }, [selected, navigation]);

  const isSelected = (u: SearchUserResult) =>
    selected.some((s) => s.userId === u.userId);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: t.bg, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={[styles.cancel, { color: t.text }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>
          New message
        </Text>
        <TouchableOpacity
          onPress={startChat}
          disabled={selected.length === 0}
          hitSlop={10}
        >
          <Text
            style={[
              styles.next,
              {
                color: selected.length > 0 ? t.text : t.textMuted,
                fontWeight: "700",
              },
            ]}
          >
            Chat
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search people"
          autoFocus
        />
      </View>

      {selected.length > 0 ? (
        <View style={styles.chips}>
          {selected.map((s) => (
            <TouchableOpacity
              key={s.userId}
              style={[styles.chip, { backgroundColor: t.bubbleIn }]}
              onPress={() => toggle(s)}
            >
              <Text style={[styles.chipText, { color: t.text }]}>
                {s.username}
              </Text>
              <Ionicons name="close" size={14} color={t.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {searching ? (
        <ActivityIndicator style={styles.loader} color={t.text} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.userId}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => toggle(item)}
              activeOpacity={0.7}
            >
              <Avatar
                username={item.username}
                profilePictureUrl={item.profilePictureUrl}
                size={44}
                style={styles.resultAvatar}
              />
              <View style={styles.resultBody}>
                <Text style={[styles.resultName, { color: t.text }]}>
                  {item.username}
                </Text>
                {item.displayName ? (
                  <Text style={[styles.resultSub, { color: t.textMuted }]}>
                    {item.displayName}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name={isSelected(item) ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={isSelected(item) ? t.text : t.textMuted}
              />
            </TouchableOpacity>
          )}
        />
      )}
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
    paddingVertical: 10,
  },
  cancel: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  next: {
    fontSize: 16,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 14,
  },
  loader: {
    marginTop: 30,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultAvatar: {
    marginRight: 12,
  },
  resultBody: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600",
  },
  resultSub: {
    fontSize: 13,
    marginTop: 1,
  },
});
