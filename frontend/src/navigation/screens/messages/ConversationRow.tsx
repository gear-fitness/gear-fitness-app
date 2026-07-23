import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/Text";
import { Conversation } from "../../../api/messageService";
import { ConversationAvatar } from "./ConversationAvatar";
import { useDmTheme } from "./dmTheme";
import {
  conversationTitle,
  messagePreview,
  otherParticipants,
  shortTime,
} from "./conversationDisplay";

type Props = {
  conversation: Conversation;
  myUserId: string;
  onPress: () => void;
  /** Long-press opens the row's action sheet (Mute/Delete). */
  onLongPress?: () => void;
};

export function ConversationRow({
  conversation,
  myUserId,
  onPress,
  onLongPress,
}: Props) {
  const t = useDmTheme();
  const unread = conversation.unreadCount > 0;
  const title = conversationTitle(conversation, myUserId);
  const preview = messagePreview(conversation);

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: t.bg }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      activeOpacity={0.6}
    >
      <ConversationAvatar
        type={conversation.type}
        imageKey={conversation.imageKey}
        members={otherParticipants(conversation, myUserId)}
        fallbackName={title}
        size={56}
        style={styles.avatar}
      />
      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            { color: t.text, fontWeight: unread ? "700" : "600" },
          ]}
        >
          {title}
        </Text>
        {/* Unread emphasis is typographic — full-strength text and weight —
            rather than another colour, keeping the list monochrome. */}
        <Text
          numberOfLines={1}
          style={[
            styles.preview,
            {
              color: unread ? t.text : t.textMuted,
              fontWeight: unread ? "500" : "400",
            },
          ]}
        >
          {preview}
        </Text>
      </View>
      <View style={styles.meta}>
        <View style={styles.metaTop}>
          {conversation.muted ? (
            <Ionicons
              name="notifications-off-outline"
              size={13}
              color={t.textFaint}
              style={styles.mutedIcon}
            />
          ) : null}
          <Text style={[styles.time, { color: t.textFaint }]}>
            {shortTime(conversation.lastMessageAt)}
          </Text>
        </View>
        {unread ? (
          <View style={[styles.dot, { backgroundColor: t.text }]} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 20,
  },
  avatar: {
    marginRight: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15.5,
    letterSpacing: -0.2,
  },
  preview: {
    fontSize: 14,
    letterSpacing: -0.1,
    marginTop: 3,
  },
  meta: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  metaTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  mutedIcon: {
    marginRight: 4,
  },
  time: {
    fontSize: 12,
    letterSpacing: -0.1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
});
