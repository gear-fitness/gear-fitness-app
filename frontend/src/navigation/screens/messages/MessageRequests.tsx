import { useCallback } from "react";
import {
  FlatList,
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
import { Conversation } from "../../../api/messageService";
import { ConversationRow } from "./ConversationRow";
import { useDmTheme } from "./dmTheme";

export function MessageRequests() {
  const t = useDmTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation() as any;
  const { user } = useAuth();
  const { requests, refreshRequests } = useMessages();

  useFocusEffect(
    useCallback(() => {
      void refreshRequests();
    }, [refreshRequests]),
  );

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationRow
        conversation={item}
        myUserId={user?.userId ?? ""}
        onPress={() =>
          navigation.navigate("MessageThread", {
            conversationId: item.conversationId,
          })
        }
      />
    ),
    [user?.userId, navigation],
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
          Requests
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={[styles.hint, { color: t.textMuted }]}>
        These people want to message you. Their messages won't be marked as seen
        until you accept.
      </Text>

      <FlatList
        data={requests}
        keyExtractor={(c) => c.conversationId}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              No message requests
            </Text>
          </View>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 26,
  },
  hint: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  empty: {
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    fontSize: 15,
  },
});
